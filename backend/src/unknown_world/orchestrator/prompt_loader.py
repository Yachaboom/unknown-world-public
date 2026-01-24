"""Unknown World - 프롬프트 로더 유틸리티.

이 모듈은 언어별로 분리된 프롬프트 파일을 로드합니다.

설계 원칙:
    - RULE-006: ko/en 언어 정책 준수 (혼합 출력 금지)
    - RULE-007/008: 프롬프트 원문 UI/로그 노출 금지

프롬프트 디렉토리 구조:
    backend/prompts/
    ├── system/
    │   ├── game_master.ko.md
    │   └── game_master.en.md
    └── turn/
        ├── turn_output_instructions.ko.md
        └── turn_output_instructions.en.md

참조:
    - vibe/prd.md 3.2 (프롬프트 파일 관리)
    - .cursor/rules/30-prompts-i18n.mdc
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

from unknown_world.models.turn import Language

# =============================================================================
# 로거 설정 (프롬프트 원문 로깅 금지 - RULE-007/008)
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# 경로 상수
# =============================================================================

# 프롬프트 루트 디렉토리 (backend/prompts/)
_PROMPTS_ROOT = Path(__file__).parent.parent.parent.parent / "prompts"

# 프롬프트 카테고리
PromptCategory = Literal["system", "turn", "image"]

# 언어 코드 매핑
_LANGUAGE_CODE_MAP: dict[Language, str] = {
    Language.KO: "ko",
    Language.EN: "en",
}


# =============================================================================
# 프롬프트 로더 함수
# =============================================================================


def _get_prompt_path(
    category: PromptCategory,
    name: str,
    language: Language,
) -> Path:
    """프롬프트 파일 경로를 반환합니다.

    Args:
        category: 프롬프트 카테고리 (system, turn, image)
        name: 프롬프트 파일 이름 (확장자 제외)
        language: 언어 (ko-KR, en-US)

    Returns:
        프롬프트 파일 경로

    Example:
        >>> _get_prompt_path("system", "game_master", Language.KO)
        Path(".../prompts/system/game_master.ko.md")
    """
    lang_code = _LANGUAGE_CODE_MAP.get(language, "ko")
    return _PROMPTS_ROOT / category / f"{name}.{lang_code}.md"


@lru_cache(maxsize=32)
def load_prompt(
    category: PromptCategory,
    name: str,
    language: Language,
) -> str:
    """프롬프트 파일을 로드합니다.

    캐싱을 통해 반복 로드를 방지합니다.
    프롬프트 원문은 로그에 기록하지 않습니다 (RULE-007/008).

    Args:
        category: 프롬프트 카테고리 (system, turn, image)
        name: 프롬프트 파일 이름 (확장자 제외)
        language: 언어 (ko-KR, en-US)

    Returns:
        프롬프트 텍스트

    Raises:
        FileNotFoundError: 프롬프트 파일이 없는 경우

    Example:
        >>> prompt = load_prompt("system", "game_master", Language.KO)
    """
    path = _get_prompt_path(category, name, language)

    # 로그에는 경로/메타만 기록 (원문 금지)
    logger.debug(
        "[PromptLoader] 프롬프트 로드",
        extra={
            "category": category,
            "name": name,
            "language": language.value,
            "path": str(path),
        },
    )

    if not path.exists():
        # 폴백: 반대 언어 시도
        fallback_lang = Language.EN if language == Language.KO else Language.KO
        fallback_path = _get_prompt_path(category, name, fallback_lang)

        if fallback_path.exists():
            logger.warning(
                "[PromptLoader] 폴백 언어 사용",
                extra={
                    "original_language": language.value,
                    "fallback_language": fallback_lang.value,
                },
            )
            return fallback_path.read_text(encoding="utf-8")

        raise FileNotFoundError(f"프롬프트 파일을 찾을 수 없습니다: {path}")

    return path.read_text(encoding="utf-8")


def load_system_prompt(language: Language) -> str:
    """Game Master 시스템 프롬프트를 로드합니다.

    Args:
        language: 언어 (ko-KR, en-US)

    Returns:
        시스템 프롬프트 텍스트
    """
    return load_prompt("system", "game_master", language)


def load_turn_instructions(language: Language) -> str:
    """TurnOutput 지시 프롬프트를 로드합니다.

    Args:
        language: 언어 (ko-KR, en-US)

    Returns:
        TurnOutput 지시 텍스트
    """
    return load_prompt("turn", "turn_output_instructions", language)


def clear_prompt_cache() -> None:
    """프롬프트 캐시를 초기화합니다.

    개발 중 핫리로드 또는 테스트 시 사용합니다.
    """
    load_prompt.cache_clear()
    logger.info("[PromptLoader] 프롬프트 캐시 초기화됨")
