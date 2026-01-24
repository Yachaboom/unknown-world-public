"""Unknown World - Pipeline Stages 패키지.

오케스트레이터 파이프라인의 각 단계(stage)를 모듈로 분리합니다.

단계 목록 (PRD 기준):
    - parse: 입력 파싱 (이미 TurnInput으로 변환됨, phase 전이만 담당)
    - validate: 비즈니스 룰 검증 + Repair loop (핵심)
    - plan: 계획 수립 (현재 pass-through)
    - resolve: 해결 (현재 pass-through)
    - render: 렌더링 (현재 pass-through)
    - verify: 검증 (현재 pass-through)
    - commit: 커밋 (최종 확정)

설계 원칙:
    - Option A (RU-005 Q1 결정): 함수 체인 방식, 클래스 도입 없음
    - 동작 보존: 기존 mock/real 경로의 결과(JSON) 의미 유지
    - 관측 가능성 SSOT: stage start/complete/fail, badges, repair를 pipeline에서 일관되게 생성

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/refactors/RU-005-SUMMARY.md
"""

from unknown_world.orchestrator.stages.commit import commit_stage
from unknown_world.orchestrator.stages.parse import parse_stage
from unknown_world.orchestrator.stages.plan import plan_stage
from unknown_world.orchestrator.stages.render import render_stage
from unknown_world.orchestrator.stages.resolve import resolve_stage
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    PipelineEvent,
    PipelineEventType,
    StageFn,
)
from unknown_world.orchestrator.stages.validate import validate_stage
from unknown_world.orchestrator.stages.verify import verify_stage

__all__ = [
    # Types
    "PipelineContext",
    "PipelineEvent",
    "PipelineEventType",
    "EmitFn",
    "StageFn",
    # Stages
    "parse_stage",
    "validate_stage",
    "plan_stage",
    "resolve_stage",
    "render_stage",
    "verify_stage",
    "commit_stage",
]
