"""Unknown World - Resolve Stage.

해결 단계입니다.
U-076에서 "정밀분석" 트리거 분기가 추가되었습니다.
U-090에서 비정밀분석 턴의 핫스팟 생성을 강제 필터링합니다.
U-115에서 핫스팟 후처리 필터(우선순위 정렬 + 겹침 제거 + 1~3개 제한)를 추가합니다.

설계 원칙:
    - RULE-008: 단계 이벤트 일관성
    - RULE-009: bbox 0~1000 정규화
    - RULE-004: 실패 시 안전한 폴백 (빈 핫스팟 + 폴백 내러티브)
    - 동작 보존: 기존 시뮬레이션 지연 유지
    - U-076: "정밀분석" 트리거 시 Agentic Vision 실행 → 핫스팟 추가
    - U-090: 비정밀분석 턴에서 GM 생성 핫스팟 조용히 제거 (서버 안전장치)
    - U-115: 핫스팟 1~3개 제한 + 면적 기반 우선순위 + 겹침 방지 필터

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/unit-plans/U-076[Mvp].md
    - vibe/unit-plans/U-090[Mvp].md
    - vibe/unit-plans/U-115[Mvp].md
"""

from __future__ import annotations

import asyncio
import logging
import math

from unknown_world.config.models import TextModelTiering
from unknown_world.models.turn import (
    AgentPhase,
    Box2D,
    Language,
    SceneObject,
)
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    PipelineEvent,
    PipelineEventType,
)

# 모의 처리 지연 시간 (ms)
RESOLVE_DELAY_MS = 150

# U-115: 핫스팟 후처리 상수
HOTSPOT_MAX_COUNT = 3  # 최대 핫스팟 개수
HOTSPOT_MIN_DISTANCE = 150  # 겹침 판정 최소 거리 (0~1000 좌표계, Q3: Option B)

# 로거 (프롬프트/비밀정보 노출 금지 - RULE-007)
logger = logging.getLogger(__name__)


# =============================================================================
# U-115: 핫스팟 후처리 필터 (우선순위 정렬 + 겹침 제거 + 개수 제한)
# =============================================================================


def _bbox_area(box: Box2D) -> int:
    """bbox 면적을 계산합니다 (0~1000 좌표계).

    Args:
        box: 바운딩 박스

    Returns:
        면적 값 (0~1000000)
    """
    return (box.ymax - box.ymin) * (box.xmax - box.xmin)


def _bbox_center(box: Box2D) -> tuple[float, float]:
    """bbox 중심점을 계산합니다 (0~1000 좌표계).

    Args:
        box: 바운딩 박스

    Returns:
        (center_x, center_y) 튜플
    """
    cx = (box.xmin + box.xmax) / 2.0
    cy = (box.ymin + box.ymax) / 2.0
    return (cx, cy)


def _center_distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    """두 중심점 간 유클리드 거리를 계산합니다.

    Args:
        a: 첫 번째 점 (x, y)
        b: 두 번째 점 (x, y)

    Returns:
        거리 값
    """
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def filter_hotspots(
    objects: list[SceneObject],
    *,
    max_count: int = HOTSPOT_MAX_COUNT,
    min_distance: int = HOTSPOT_MIN_DISTANCE,
) -> list[SceneObject]:
    """핫스팟을 우선순위 정렬 + 겹침 제거 + 개수 제한으로 필터링합니다.

    U-115[Mvp]: 정밀분석 결과의 핫스팟을 1~3개로 제한하고,
    크기가 큰 오브젝트를 우선 선택하며, 중심점 거리가 임계값 미만인
    겹치는 핫스팟을 배제합니다.

    Args:
        objects: 원본 SceneObject 목록
        max_count: 최대 유지 개수 (기본 3)
        min_distance: 겹침 판정 최소 거리 (기본 150, 0~1000 좌표계)

    Returns:
        필터링된 SceneObject 목록 (최대 max_count개)
    """
    if not objects:
        return []

    # 1. 면적 기준 내림차순 정렬 (큰 오브젝트 우선)
    sorted_objs = sorted(objects, key=lambda o: _bbox_area(o.box_2d), reverse=True)

    # 2. 겹침 필터 + 개수 제한
    selected: list[SceneObject] = []
    for obj in sorted_objs:
        if len(selected) >= max_count:
            break

        center = _bbox_center(obj.box_2d)

        # 이미 선택된 핫스팟과의 거리 검사
        is_overlapping = any(
            _center_distance(center, _bbox_center(s.box_2d)) < min_distance for s in selected
        )

        if not is_overlapping:
            selected.append(obj)

    return selected


# =============================================================================
# 정밀분석 (Agentic Vision) 처리 (U-076)
# =============================================================================


def _is_vision_trigger(ctx: PipelineContext) -> bool:
    """정밀분석(비전 분석) 트리거 여부를 확인합니다.

    Args:
        ctx: 파이프라인 컨텍스트

    Returns:
        정밀분석 트리거 여부
    """
    action_id = ctx.turn_input.action_id
    text = ctx.turn_input.text
    return TextModelTiering.is_vision_trigger(action_id, text)


def _get_current_image_url(ctx: PipelineContext) -> str | None:
    """현재 Scene 이미지 URL을 확인합니다.

    정밀분석은 이미지가 있을 때만 실행 가능합니다.

    Args:
        ctx: 파이프라인 컨텍스트

    Returns:
        이미지 URL 또는 None
    """
    # 1. TurnInput에서 이전 이미지 URL 확인 (U-068)
    if ctx.turn_input.previous_image_url:
        return ctx.turn_input.previous_image_url

    # 2. TurnOutput.render에서 이미지 URL 확인
    if ctx.output and ctx.output.render and ctx.output.render.image_url:
        return ctx.output.render.image_url

    return None


async def _execute_vision_analysis(
    ctx: PipelineContext,
    image_url: str,
) -> PipelineContext:
    """Agentic Vision 분석을 실행하고 결과를 TurnOutput에 반영합니다.

    Args:
        ctx: 파이프라인 컨텍스트
        image_url: 분석할 Scene 이미지 URL

    Returns:
        업데이트된 컨텍스트
    """
    if ctx.output is None:
        return ctx

    language = ctx.turn_input.language

    try:
        from unknown_world.services.agentic_vision import (
            affordances_to_scene_objects,
            get_agentic_vision_service,
        )

        vision_service = get_agentic_vision_service()

        # 핫스팟 1개 미만 시 최대 2회 리트라이
        MAX_VISION_RETRIES = 2
        result = await vision_service.analyze_scene(image_url, language)

        for retry in range(MAX_VISION_RETRIES):
            if result.success and result.affordances:
                logger.info(
                    f"[Resolve] Vision analysis OK: {len(result.affordances)} hotspots"
                    f"{f' (after {retry} retries)' if retry > 0 else ''}",
                )
                break
            logger.warning(
                f"[Resolve] Vision retry {retry + 1}/{MAX_VISION_RETRIES}: "
                f"success={result.success}, affordances={len(result.affordances) if result.success else 0}, "
                f"msg={result.message}",
            )
            result = await vision_service.analyze_scene(image_url, language)
        else:
            # 리트라이 모두 소진 후에도 결과 확인
            if result.success and result.affordances:
                logger.info(
                    f"[Resolve] Vision analysis OK on final attempt: {len(result.affordances)} hotspots",
                )

        if result.success and result.affordances:
            # affordances → SceneObject 변환
            new_objects = affordances_to_scene_objects(result.affordances)

            # 정밀분석: 비전 결과로 대체 (텍스트 모델은 이미지를 보지 않아 불일치)
            # 텍스트 모델이 생성한 objects는 내러티브 기반이므로
            # 실제 이미지를 분석한 비전 결과만 사용해야 정합성 유지

            # U-115: 우선순위 정렬 + 겹침 제거 + 1~3개 제한
            merged_objects = filter_hotspots(new_objects)

            # UI 업데이트
            new_ui = ctx.output.ui.model_copy(update={"objects": merged_objects})
            ctx.output = ctx.output.model_copy(update={"ui": new_ui})

            # 내러티브 보강: "장면을 자세히 살펴보니..."
            discovered_labels = [aff.label for aff in result.affordances]
            if language == Language.KO:
                vision_narrative = (
                    f"\n\n장면을 자세히 살펴봅니다... "
                    f"{', '.join(discovered_labels)}이(가) 눈에 들어옵니다."
                )
            else:
                vision_narrative = (
                    f"\n\nYou examine the scene closely... "
                    f"You notice {', '.join(discovered_labels)}."
                )

            new_narrative = ctx.output.narrative + vision_narrative
            ctx.output = ctx.output.model_copy(update={"narrative": new_narrative})

            logger.info(
                "[Resolve] Detailed analysis succeeded (U-076, U-115 filter applied)",
                extra={
                    "affordance_count": len(result.affordances),
                    "pre_filter_count": len(new_objects),
                    "merged_object_count": len(merged_objects),
                    "analysis_time_ms": result.analysis_time_ms,
                },
            )

        else:
            # 분석 실패 또는 결과 없음 → 폴백 내러티브 (RULE-004)
            if language == Language.KO:
                fallback_text = "\n\n자세히 봐도 특별한 것은 보이지 않습니다."
            else:
                fallback_text = "\n\nEven looking closely, nothing special catches your eye."

            new_narrative = ctx.output.narrative + fallback_text
            ctx.output = ctx.output.model_copy(update={"narrative": new_narrative})

            logger.info(
                "[Resolve] Detailed analysis empty/failed, fallback narrative applied (U-076)",
                extra={
                    "success": result.success,
                    "message": result.message,
                },
            )

    except Exception as e:
        # 예외 발생 시 안전한 폴백 (RULE-004)
        logger.error(
            "[Resolve] Exception during detailed analysis, fallback applied",
            extra={"error_type": type(e).__name__},
        )
        if language == Language.KO:
            fallback_text = "\n\n자세히 봐도 특별한 것은 보이지 않습니다."
        else:
            fallback_text = "\n\nEven looking closely, nothing special catches your eye."

        new_narrative = ctx.output.narrative + fallback_text
        ctx.output = ctx.output.model_copy(update={"narrative": new_narrative})

    # 이미지 생성 강제 비활성 (정밀분석은 이미지 생성 없음)
    if ctx.output and ctx.output.render and ctx.output.render.image_job:
        no_gen_job = ctx.output.render.image_job.model_copy(update={"should_generate": False})
        new_render = ctx.output.render.model_copy(update={"image_job": no_gen_job})
        ctx.output = ctx.output.model_copy(update={"render": new_render})

    # 비용 배수 적용 (U-076 Q2: 1.5x)
    ctx.cost_multiplier = TextModelTiering.VISION_COST_MULTIPLIER

    return ctx


# =============================================================================
# Stage 함수
# =============================================================================


async def resolve_stage(ctx: PipelineContext, *, emit: EmitFn) -> PipelineContext:
    """Resolve 단계를 실행합니다.

    U-076: "정밀분석" 트리거가 감지되면 Agentic Vision 서비스를 호출하여
    이미지 내 오브젝트를 분석하고 핫스팟을 추가합니다.
    그 외에는 pass-through로 동작합니다.

    Args:
        ctx: 파이프라인 컨텍스트
        emit: 이벤트 emit 콜백

    Returns:
        업데이트된 컨텍스트
    """
    ctx.current_phase = AgentPhase.RESOLVE

    # Stage 시작 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_START,
            phase=AgentPhase.RESOLVE,
        )
    )

    # U-076: 정밀분석 트리거 감지
    if _is_vision_trigger(ctx) and ctx.output is not None:
        image_url = _get_current_image_url(ctx)

        if image_url:
            logger.info(
                "[Resolve] Detailed analysis trigger detected, running Agentic Vision (U-076)",
                extra={
                    "action_id": ctx.turn_input.action_id,
                    "has_image": True,
                },
            )
            ctx = await _execute_vision_analysis(ctx, image_url)
        else:
            logger.info(
                "[Resolve] Detailed analysis trigger detected, but no image - skipping",
            )
    else:
        # 기존 동작: pass-through + 모의 지연
        await asyncio.sleep(RESOLVE_DELAY_MS / 1000.0)

        # U-090: 비정밀분석 턴에서 GM이 생성한 핫스팟 조용히 제거
        # GM이 프롬프트 지시를 무시하고 objects[]에 핫스팟을 추가할 수 있으므로
        # 서버에서 강제로 빈 배열로 설정합니다 (Q2 결정: Option A - 조용히 제거)
        if ctx.output is not None and ctx.output.ui.objects:
            stripped_count = len(ctx.output.ui.objects)
            logger.warning(
                "[Resolve] U-090: Removed %d GM-generated hotspots from non-analysis turn",
                stripped_count,
                extra={
                    "stripped_object_count": stripped_count,
                    "action_id": ctx.turn_input.action_id,
                },
            )
            new_ui = ctx.output.ui.model_copy(update={"objects": []})
            ctx.output = ctx.output.model_copy(update={"ui": new_ui})

    # Stage 완료 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_COMPLETE,
            phase=AgentPhase.RESOLVE,
        )
    )

    return ctx
