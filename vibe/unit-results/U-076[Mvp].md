# [U-076] "정밀분석" Agentic Vision 분석 및 핫스팟 추가 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-076[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-07 16:30
- **담당**: AI Agent

---

## 1. 작업 요약

Scene 이미지가 존재할 때 "정밀분석" 액션을 통해 `gemini-3-flash-preview` 비전 모델로 이미지를 정밀 분석하고, 발견된 오브젝트를 핫스팟(SceneObject)으로 추가하는 기능을 구현했습니다.

---

## 2. 작업 범위

- **Agentic Vision 서비스 구현**: `gemini-3-flash-preview` + `code_execution`을 활용한 이미지 분석 및 bbox 추출.
- **오케스트레이터 연동**: `ResolveStage`에서 정밀분석 트리거 감지 및 비전 서비스 호출 로직 추가.
- **비용 정책 적용**: 정밀분석 액션 실행 시 1.5x Signal 비용 배수 적용.
- **프롬프트 관리**: 언어별(ko, en) 비전 분석 전용 프롬프트 파일 분리 및 로딩 로직.
- **ActionDeck UI 강화**: "정밀분석" 카드 전용 UI(시안 테두리, VISION 배지, 1.5x 비용 표기) 구현.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/services/agentic_vision.py` | 신규 | Agentic Vision 분석 서비스 핵심 로직 |
| `backend/src/unknown_world/orchestrator/stages/resolve.py` | 수정 | 정밀분석 트리거 감지 및 서비스 연동 |
| `backend/src/unknown_world/config/models.py` | 수정 | VISION 모델 라벨, 비용 배수, 트리거 키워드 정의 |
| `backend/prompts/vision/scene_affordances.ko.md` | 신규 | 비전 분석 시스템 프롬프트 (한국어) |
| `backend/prompts/vision/scene_affordances.en.md` | 신규 | 비전 분석 시스템 프롬프트 (영어) |
| `frontend/src/components/ActionDeck.tsx` | 수정 | VISION 카드 UI 및 1.5x 비용 계산 로직 |
| `frontend/src/style.css` | 수정 | .card-vision 및 .vision-badge 스타일 추가 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | i18n 라벨 추가 |
| `vibe/unit-runbooks/U-076-vision-analysis-runbook.md` | 신규 | 정밀분석 기능 검증용 런북 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**Agentic Vision 서비스**:
- `AgenticVisionService.analyze_scene(image_url, language)`: 이미지를 로드하고 Gemini 3 비전 모델을 호출하여 JSON 형식의 오브젝트 목록을 반환합니다.
- **BBox 규약**: 0~1000 정규화된 `[ymin, xmin, ymax, xmax]` 포맷을 준수하며, `_normalize_bbox` 유틸리티를 통해 유효성을 강제합니다.
- **폴백**: 이미지 로드 실패 또는 API 에러 시 빈 배열을 반환하여 게임 흐름이 끊기지 않도록 설계되었습니다.

**비용 및 트리거**:
- **트리거**: "정밀분석", "장면 분석", "analyze scene" 등의 키워드 또는 전용 액션 ID 감지 시 실행됩니다.
- **비용 배수**: `VISION_COST_MULTIPLIER = 1.5`를 적용하여 일반 턴보다 높은 비용을 소모합니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 생성된 Scene 이미지를 읽기 위해 `.data/images/generated/` 디렉토리에 접근합니다.
- **모델 사용**: `gemini-3-flash-preview` 모델을 사용하며, `code_execution` 도구를 활성화하여 추출 정확도를 높였습니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-076-vision-analysis-runbook.md`
- **실행 결과**: 런북에 정의된 8가지 시나리오(카드 노출, 분석 실행, 비용 적용, 폴백 등)를 기반으로 구현 및 검증을 완료했습니다.

---

## 6. 리스크 및 주의사항

- **지연 시간**: 비전 모델 호출로 인해 일반 턴보다 응답 시간이 길어질 수 있으나, SSE를 통해 단계를 명확히 표시하여 UX를 보완했습니다.
- **API 비용**: 1.5x 비용이 책정되어 있으나, 실제 API 호출 비용을 고려하여 남용되지 않도록 관리해야 합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-077[Mvp]**: 인벤토리 아이템을 Scene 오브젝트에 드랍하여 상호작용하는 기능 개발.
2. **U-078[Mvp]**: 분석된 핫스팟 클릭 시 상세 정보를 제공하는 오토파일럿 보강.

### 7.2 의존 단계 확인

- **선행 단계**: U-010(Canvas), U-019(Image Gen), U-069(Tiering) 완료.
- **후속 단계**: U-077(Item-Object Interaction) 예정.

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] BBox 0~1000 정규화 규약 준수
- [x] 1.5x 비용 배수 및 시안 테두리 UI 적용
- [x] 분석 실패 시 안전한 폴백 내러티브 제공
- [x] 새 이미지 생성 없이 기존 이미지 유지 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._