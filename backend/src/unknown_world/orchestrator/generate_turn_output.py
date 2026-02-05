"""Unknown World - TurnOutput 생성 모듈 (Structured Outputs).

이 모듈은 Gemini 텍스트 모델을 Structured Outputs(JSON Schema) 모드로 호출해
TurnOutput을 생성하고, Pydantic 검증을 통과한 결과만 반환합니다.

설계 원칙:
    - RULE-003: 구조화 출력(JSON Schema) 우선 + 이중 검증(Pydantic+Zod)
    - RULE-004: 검증 실패 시 자동 복구(Repair loop) + 안전한 폴백
    - RULE-005: 재화 인바리언트 (잔액 음수 금지)
    - RULE-006: ko/en 언어 정책 준수
    - RULE-007/008: 프롬프트/내부 추론 노출 금지

페어링 질문 결정:
    - Q1: 기본 텍스트 생성 모델 라벨 = FAST (Option A)

참조:
    - vibe/unit-plans/U-017[Mvp].md
    - vibe/unit-results/U-016[Mvp].md
    - vibe/unit-results/U-005[Mvp].md
    - .cursor/rules/20-backend-orchestrator.mdc
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, cast

from pydantic import ValidationError

from unknown_world.config.models import ModelLabel, TextModelTiering
from unknown_world.models.turn import (
    CurrencyAmount,
    Language,
    TurnInput,
    TurnOutput,
)
from unknown_world.orchestrator.fallback import create_safe_fallback
from unknown_world.orchestrator.prompt_loader import (
    load_image_prompt,
    load_system_prompt,
    load_turn_instructions,
)
from unknown_world.services.genai_client import (
    GenerateRequest,
    get_genai_client,
)

# =============================================================================
# 로거 설정 (프롬프트/내부 추론 노출 금지 - RULE-007/008)
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# Gemini API 스키마 호환성 (U-080 핫픽스)
# =============================================================================


def _strip_additional_properties(schema: dict[str, Any]) -> dict[str, Any]:
    """JSON Schema에서 additionalProperties 필드를 재귀적으로 제거합니다.

    Gemini API는 Pydantic이 생성하는 `additionalProperties` 필드를 인식하지 못하여
    `400 INVALID_ARGUMENT: Unknown name "additional_properties"` 에러가 발생합니다.
    이 함수는 스키마에서 해당 필드를 제거하여 Gemini API와 호환되게 합니다.

    Args:
        schema: Pydantic model_json_schema()로 생성된 JSON Schema

    Returns:
        additionalProperties가 제거된 JSON Schema
    """
    # 현재 레벨에서 additionalProperties 제거
    cleaned: dict[str, Any] = {}
    for key, value in schema.items():
        if key == "additionalProperties":
            continue

        # 값 타입에 따라 재귀 처리
        cleaned_value: Any
        if isinstance(value, dict):
            # dict인 경우 재귀 호출
            nested_dict = cast(dict[str, Any], value)
            cleaned_value = _strip_additional_properties(nested_dict)
        elif isinstance(value, list):
            # list인 경우 각 요소 처리
            cleaned_list: list[Any] = []
            value_list = cast(list[Any], value)
            for item in value_list:
                if isinstance(item, dict):
                    nested_item = cast(dict[str, Any], item)
                    cleaned_list.append(_strip_additional_properties(nested_item))
                else:
                    cleaned_list.append(item)
            cleaned_value = cleaned_list
        else:
            cleaned_value = value

        cleaned[key] = cleaned_value

    return cleaned


# =============================================================================
# 생성 결과 타입
# =============================================================================


class GenerationStatus(StrEnum):
    """생성 결과 상태."""

    SUCCESS = "success"
    """Pydantic 검증 통과"""

    SCHEMA_FAILURE = "schema_failure"
    """JSON 파싱 또는 스키마 검증 실패 (복구 대상)"""

    BUSINESS_FAILURE = "business_failure"
    """비즈니스 룰 위반 (U-018에서 처리)"""

    SAFETY_BLOCKED = "safety_blocked"
    """안전 정책에 의해 차단됨"""

    API_ERROR = "api_error"
    """API 호출 실패"""


@dataclass
class GenerationResult:
    """TurnOutput 생성 결과.

    Attributes:
        status: 생성 상태
        output: 생성된 TurnOutput (성공 시)
        error_message: 에러 메시지 (실패 시, 사용자 표시용)
        error_details: 상세 에러 정보 (내부용, UI 노출 금지)
        model_label: 사용된 모델 라벨
        cost_multiplier: 비용 배수 (U-069: FAST=1.0, QUALITY=2.0)
        raw_response: 원본 응답 텍스트 (디버그용, UI 노출 금지)
    """

    status: GenerationStatus
    output: TurnOutput | None = None
    error_message: str = ""
    error_details: dict[str, Any] = field(default_factory=lambda: {})
    model_label: ModelLabel = ModelLabel.FAST
    cost_multiplier: float = 1.0
    raw_response: str = ""


# =============================================================================
# TurnOutput 생성기
# =============================================================================


class TurnOutputGenerator:
    """Structured Outputs를 사용한 TurnOutput 생성기.

    Gemini 모델을 JSON Schema 모드로 호출하고,
    Pydantic으로 응답을 검증합니다.

    Example:
        >>> generator = TurnOutputGenerator()
        >>> result = await generator.generate(turn_input)
        >>> if result.status == GenerationStatus.SUCCESS:
        ...     print(result.output.narrative)
    """

    def __init__(
        self,
        *,
        default_model_label: ModelLabel = ModelLabel.FAST,
        force_mock: bool = False,
    ) -> None:
        """TurnOutputGenerator를 초기화합니다.

        Args:
            default_model_label: 기본 모델 라벨 (Q1 결정: FAST)
            force_mock: Mock 클라이언트 강제 사용 여부
        """
        self._default_model_label = default_model_label
        self._force_mock = force_mock
        self._json_schema: dict[str, Any] | None = None

    def _select_text_model(self, turn_input: TurnInput) -> tuple[ModelLabel, float]:
        """액션 기반 텍스트 모델을 선택합니다 (U-069).

        FAST 모델 기본 + "정밀조사" 트리거 시 QUALITY 모델 전환.

        페어링 질문 결정:
            - Q1: Option B - 액션 ID + 키워드 매칭
            - Q2: Option A - 2x (기본 비용의 2배)

        Args:
            turn_input: 사용자 턴 입력

        Returns:
            (model_label, cost_multiplier) 튜플
        """
        action_id = turn_input.action_id
        text = turn_input.text

        # QUALITY 트리거 검사
        if TextModelTiering.is_quality_trigger(action_id, text):
            model_label = ModelLabel.QUALITY
            logger.info(
                "[TurnOutputGenerator] QUALITY 모델 트리거 감지 (U-069)",
                extra={
                    "action_id": action_id,
                    "has_trigger_keyword": bool(text),
                    "model_label": model_label,
                },
            )
        else:
            model_label = self._default_model_label

        cost_multiplier = TextModelTiering.get_cost_multiplier(model_label)
        return model_label, cost_multiplier

    def _get_json_schema(self) -> dict[str, Any]:
        """TurnOutput JSON Schema를 반환합니다 (캐싱).

        U-080 핫픽스: Gemini API 호환성을 위해 additionalProperties 필드를 제거합니다.
        Gemini API는 이 필드를 인식하지 못하여 400 에러가 발생합니다.
        """
        if self._json_schema is not None:
            return self._json_schema

        raw_schema = TurnOutput.model_json_schema()
        # Gemini API 호환성: additionalProperties 제거
        self._json_schema = _strip_additional_properties(raw_schema)
        return self._json_schema

    def _build_prompt(
        self,
        turn_input: TurnInput,
        world_context: str = "",
    ) -> str:
        """전체 프롬프트를 구성합니다.

        Args:
            turn_input: 사용자 턴 입력
            world_context: 현재 세계 상태 요약 (선택)

        Returns:
            조합된 프롬프트 문자열
        """
        # 언어별 프롬프트 로드
        system_prompt = load_system_prompt(turn_input.language)
        turn_instructions = load_turn_instructions(turn_input.language)

        # U-061: 이미지 생성 가이드라인 로드 및 시스템 프롬프트에 추가
        # Q1 결정: Option A (Game Master 시스템 프롬프트에 섹션 추가)
        # Q2 결정: Option A (영문 없으면 한국어로 폴백 - prompt_loader에서 처리)
        try:
            image_guidelines = load_image_prompt(turn_input.language)
            # 이미지 가이드라인을 시스템 프롬프트 끝에 섹션으로 추가
            system_prompt = f"""{system_prompt}

---

## 이미지 생성 지침 (Image Generation Guidelines)

아래 가이드라인에 따라 `image_job.prompt` 필드를 작성하세요.
LLM이 이미지 모델에 최적화된 고품질 프롬프트를 생성할 수 있도록 합니다.

{image_guidelines}"""
            logger.debug(
                "[TurnOutputGenerator] 이미지 가이드라인 로드 완료",
                extra={"language": turn_input.language.value},
            )
        except FileNotFoundError:
            # 가이드라인 없으면 기본 프롬프트만 사용 (안전한 폴백)
            logger.warning(
                "[TurnOutputGenerator] 이미지 가이드라인 파일 미존재, 기본 프롬프트 사용",
                extra={"language": turn_input.language.value},
            )

        # 입력 정보 구성 (프롬프트에 포함)
        input_summary = f"""
## 현재 턴 입력

- language: {turn_input.language.value}
- text: "{turn_input.text}"
- action_id: {turn_input.action_id or "없음"}
- economy_snapshot:
  - signal: {turn_input.economy_snapshot.signal}
  - memory_shard: {turn_input.economy_snapshot.memory_shard}
"""

        # 세계 상태 컨텍스트 (있는 경우)
        world_section = ""
        if world_context:
            world_section = f"""
## 현재 세계 상태

{world_context}
"""

        # 전체 프롬프트 조합
        full_prompt = f"""{system_prompt}

---

{turn_instructions}

---

{input_summary}
{world_section}

---

위 지시에 따라 TurnOutput JSON을 생성하세요.
"""
        return full_prompt

    async def generate(
        self,
        turn_input: TurnInput,
        *,
        world_context: str = "",
    ) -> GenerationResult:
        """TurnOutput을 생성합니다.

        Structured Outputs(JSON Schema) 모드로 Gemini를 호출하고,
        Pydantic으로 응답을 검증합니다.

        U-069: FAST 모델 기본 + "정밀조사" 트리거 시 QUALITY 모델 전환.
            - Q1: Option B - 액션 ID + 키워드 매칭
            - Q2: Option A - 2x (기본 비용의 2배)

        Args:
            turn_input: 사용자 턴 입력
            world_context: 현재 세계 상태 요약 (선택)

        Returns:
            GenerationResult: 생성 결과 (status, output, error 등)
        """
        # U-069: 모델 티어링 - 액션/키워드 기반 모델 선택
        label, cost_multiplier = self._select_text_model(turn_input)

        # 로그에는 메타만 기록 (프롬프트 원문 금지 - RULE-007/008)
        logger.info(
            "[TurnOutputGenerator] 생성 요청",
            extra={
                "language": turn_input.language.value,
                "model_label": label,
                "cost_multiplier": cost_multiplier,
                "has_text": bool(turn_input.text),
                "has_action_id": bool(turn_input.action_id),
            },
        )

        try:
            # GenAI 클라이언트 가져오기
            client = get_genai_client(force_mock=self._force_mock)

            # 프롬프트 구성
            prompt = self._build_prompt(turn_input, world_context)

            # Structured Outputs 요청 구성 (RULE-003)
            # SDK 레벨에서 JSON Schema를 강제하여 파싱 오류를 최소화합니다.
            json_schema = self._get_json_schema()
            request = GenerateRequest(
                prompt=prompt,
                model_label=label,
                temperature=0.7,  # 창의성 적당히
                response_mime_type="application/json",
                response_schema=json_schema,
            )

            # API 호출
            response = await client.generate(request)
            raw_text = response.text

            # Pydantic 검증 (model_validate_json 사용 - U-017 완료 기준)
            # Structured Outputs로 인해 응답이 이미 JSON이므로
            # 마크다운 코드블록 처리 후 직접 검증합니다.
            try:
                # 응답에서 JSON 부분 추출 (마크다운 코드블록 처리)
                json_text = self._extract_json(raw_text)

                # model_validate_json: JSON 문자열을 직접 파싱+검증 (U-017 완료 기준)
                turn_output = TurnOutput.model_validate_json(json_text)

                # U-069: QUALITY 모델 비용 배수 적용
                # 비즈니스 룰 검증 전에 비용과 balance_after를 조정합니다.
                if cost_multiplier > 1.0:
                    original_signal = turn_output.economy.cost.signal
                    original_shard = turn_output.economy.cost.memory_shard

                    # 추가 비용 계산
                    additional_signal = int(original_signal * (cost_multiplier - 1))
                    additional_shard = int(original_shard * (cost_multiplier - 1))

                    # 비용 증가
                    turn_output.economy.cost.signal = original_signal + additional_signal
                    turn_output.economy.cost.memory_shard = original_shard + additional_shard

                    # balance_after 감소 (추가 비용만큼)
                    turn_output.economy.balance_after.signal -= additional_signal
                    turn_output.economy.balance_after.memory_shard -= additional_shard

                    logger.info(
                        "[TurnOutputGenerator] 비용 배수 적용 (U-069)",
                        extra={
                            "original_signal": original_signal,
                            "multiplied_signal": turn_output.economy.cost.signal,
                            "additional_signal": additional_signal,
                            "cost_multiplier": cost_multiplier,
                        },
                    )

                # 성공
                logger.info(
                    "[TurnOutputGenerator] 생성 성공",
                    extra={
                        "model_label": label,
                        "cost_multiplier": cost_multiplier,
                        "has_narrative": bool(turn_output.narrative),
                        "cost_signal": turn_output.economy.cost.signal,
                    },
                )

                return GenerationResult(
                    status=GenerationStatus.SUCCESS,
                    output=turn_output,
                    model_label=label,
                    cost_multiplier=cost_multiplier,
                    raw_response=raw_text,
                )

            except ValidationError as e:
                # 스키마 검증 실패 (복구 대상 - U-018에서 처리)
                logger.warning(
                    "[TurnOutputGenerator] Pydantic 검증 실패 (복구 대상)",
                    extra={
                        "error_count": len(e.errors()),
                        "model_label": label,
                    },
                )
                return GenerationResult(
                    status=GenerationStatus.SCHEMA_FAILURE,
                    error_message="응답 형식이 올바르지 않습니다"
                    if turn_input.language == Language.KO
                    else "Invalid response format",
                    error_details={
                        "validation_errors": [
                            {"loc": err["loc"], "type": err["type"]} for err in e.errors()
                        ]
                    },
                    model_label=label,
                    cost_multiplier=cost_multiplier,
                    raw_response=raw_text,
                )
            except json.JSONDecodeError as e:
                # JSON 파싱 실패 (복구 대상)
                logger.warning(
                    "[TurnOutputGenerator] JSON 파싱 실패 (복구 대상)",
                    extra={"error_type": "JSONDecodeError"},
                )
                return GenerationResult(
                    status=GenerationStatus.SCHEMA_FAILURE,
                    error_message="응답을 파싱할 수 없습니다"
                    if turn_input.language == Language.KO
                    else "Failed to parse response",
                    error_details={"json_error": str(e)},
                    model_label=label,
                    cost_multiplier=cost_multiplier,
                    raw_response=raw_text,
                )

        except RuntimeError as e:
            # API 호출 실패
            logger.error(
                "[TurnOutputGenerator] API 호출 실패",
                extra={"error_type": type(e).__name__},
            )
            return GenerationResult(
                status=GenerationStatus.API_ERROR,
                error_message="서비스에 연결할 수 없습니다"
                if turn_input.language == Language.KO
                else "Unable to connect to service",
                error_details={"api_error": str(e)},
                model_label=label,
                cost_multiplier=cost_multiplier,
            )

        except Exception as e:
            # 예상치 못한 오류
            logger.exception(
                "[TurnOutputGenerator] 예상치 못한 오류",
                extra={"error_type": type(e).__name__},
            )
            return GenerationResult(
                status=GenerationStatus.API_ERROR,
                error_message="처리 중 오류가 발생했습니다"
                if turn_input.language == Language.KO
                else "An error occurred during processing",
                error_details={"unexpected_error": type(e).__name__},
                model_label=label,
                cost_multiplier=cost_multiplier,
            )

    def _extract_json(self, text: str) -> str:
        """응답 텍스트에서 JSON 부분을 추출합니다.

        마크다운 코드블록으로 감싸진 경우를 처리합니다.

        Args:
            text: 원본 응답 텍스트

        Returns:
            JSON 문자열
        """
        text = text.strip()

        # 마크다운 코드블록 처리 (```json ... ```)
        if text.startswith("```"):
            lines = text.split("\n")
            # 첫 줄(```json)과 마지막 줄(```) 제거
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        return text.strip()

    def create_safe_fallback(
        self,
        language: Language,
        error_message: str,  # noqa: ARG002 - 하위 호환용 (실제로 사용하지 않음)
        economy_snapshot: CurrencyAmount | None = None,
    ) -> TurnOutput:
        """안전한 폴백 TurnOutput을 생성합니다.

        검증 실패 또는 에러 발생 시 사용합니다.
        (RULE-004: 안전한 폴백 제공)

        Note:
            이 메서드는 fallback.create_safe_fallback SSOT로 위임합니다 (RU-005-Q1).

        Args:
            language: 언어
            error_message: 에러 메시지 (하위 호환용, 실제 미사용)
            economy_snapshot: 현재 재화 상태 (비용 0으로 유지)

        Returns:
            안전한 폴백 TurnOutput
        """
        # RU-005-Q1: fallback SSOT로 위임
        return create_safe_fallback(
            language=language,
            economy_snapshot=economy_snapshot,
            repair_count=0,
            is_blocked=False,
        )


# =============================================================================
# 편의 함수
# =============================================================================

# 기본 생성기 인스턴스 (싱글톤)
_default_generator: TurnOutputGenerator | None = None


def get_turn_output_generator(
    *,
    force_mock: bool = False,
    force_new: bool = False,
) -> TurnOutputGenerator:
    """TurnOutputGenerator 인스턴스를 반환합니다.

    Args:
        force_mock: Mock 클라이언트 강제 사용 여부
        force_new: 새 인스턴스 생성 여부

    Returns:
        TurnOutputGenerator 인스턴스
    """
    global _default_generator

    if force_new or _default_generator is None or force_mock:
        _default_generator = TurnOutputGenerator(
            default_model_label=ModelLabel.FAST,  # Q1 결정: FAST 기본
            force_mock=force_mock,
        )

    return _default_generator


async def generate_turn_output(
    turn_input: TurnInput,
    *,
    world_context: str = "",
    force_mock: bool = False,
) -> GenerationResult:
    """TurnOutput을 생성하는 편의 함수.

    Note:
        현재 항상 FAST 모델을 사용합니다.
        QUALITY 모델은 추후 "정밀 조사" 기능 구현 시 별도 경로로 추가 예정.

    Args:
        turn_input: 사용자 턴 입력
        world_context: 현재 세계 상태 요약 (선택)
        force_mock: Mock 클라이언트 강제 사용 여부

    Returns:
        GenerationResult: 생성 결과

    Example:
        >>> result = await generate_turn_output(turn_input)
        >>> if result.status == GenerationStatus.SUCCESS:
        ...     print(result.output.narrative)
    """
    generator = get_turn_output_generator(force_mock=force_mock)
    return await generator.generate(
        turn_input,
        world_context=world_context,
    )
