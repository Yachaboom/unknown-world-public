# U-075[Mvp]: 인벤토리 아이템 아이콘 동적 생성 및 이름 정합성 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-075[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-06 17:35
- **담당**: AI Agent

---

## 1. 작업 요약

새 아이템 획득 시 **아이템 설명을 기반으로 아이콘 이미지를 동적 생성**하고, 배경 투명 처리(rembg), 캐싱, 그리고 세션 언어에 따른 아이템 이름 정합성을 보장하는 기능을 구현하였습니다. 텍스트 TTFB를 저해하지 않도록 **Option B(Placeholder 선표시 후 백그라운드 생성)** 전략을 채택하였습니다.

---

## 2. 작업 범위

- **백엔드 아이콘 생성 엔진**: 아이템 설명 기반 프롬프트 생성 및 `IMAGE_FAST` 모델 연동.
- **배경 제거 파이프라인**: `rembg`를 활용한 아이콘 배경 투명화 처리 (U-035 연동).
- **캐싱 시스템**: 설명 해시 기반 파일 시스템 캐싱으로 동일 아이템 중복 생성 방지.
- **아이템 이름 정합성**: `turn_output_instructions` 강화를 통해 세션 언어(ko/en)와 일치하는 아이템명 생성 보장.
- **프론트엔드 비동기 렌더링**: `inventoryStore` 상태 관리 및 `InventoryPanel` 내 비동기 아이콘 교체 로직 구현.

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/services/item_icon_generator.py` | 신규 | 아이템 아이콘 생성 및 캐싱 서비스 핵심 로직 |
| `backend/src/unknown_world/api/item_icon.py` | 신규 | 아이콘 생성 및 상태 조회 API 엔드포인트 |
| `backend/src/unknown_world/models/turn.py` | 수정 | `InventoryItem` 모델에 `icon_url` 필드 추가 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | 아이콘 전용 `IMAGE_FAST` 모델 매핑 보강 |
| `frontend/src/stores/inventoryStore.ts` | 수정 | 아이템 아이콘 URL 관리 및 비동기 업데이트 로직 |
| `frontend/src/components/InventoryPanel.tsx` | 수정 | 동적 아이콘 렌더링 및 placeholder 애니메이션 적용 |
| `backend/tests/integration/test_item_icon_api.py` | 신규 | 아이콘 API 통합 테스트 |
| `backend/tests/unit/services/test_item_icon_generator.py` | 신규 | 생성기 유닛 테스트 |
| `vibe/unit-runbooks/U-075-item-icon-dynamic-runbook.md` | 신규 | 수동 검증 및 실행 가이드 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**ItemIconGenerator**:
- `generate_icon(item_id, description, wait=False)`: 비동기 생성 지원.
- **Prompt Engineering**: 픽셀 아트 스타일 RPG 아이콘 프롬프트 고정 적용.
- **Background Removal**: `rembg`의 `alpha_matting`을 사용하여 외곽선 품질 확보.

**이름 정합성 (Language Consistency)**:
- `turn_output_instructions.ko/en.md`를 수정하여 모델이 항상 현재 세션 언어로 아이템 이름을 출력하도록 강제함.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `.data/images/generated/icons/` 경로에 아이콘 에셋 누적 (캐싱으로 용량 제어).
- **성능**: 백그라운드 비동기 생성을 통해 턴 응답 속도(TTFB) 영향 최소화.
- **비용**: `IMAGE_FAST` 모델(gemini-2.5-flash-image) 사용으로 이미지 생성 비용 최적화.

### 4.3 가정 및 제약사항

- `rembg` 모델(`birefnet-general`)이 사전에 로드되어 있어야 최적의 속도로 배경 제거가 가능함.
- 브라우저 세션 중 새로고침 시 `inventoryStore`가 초기화되더라도 백엔드 캐시를 통해 즉시 복구됨.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-075-item-icon-dynamic-runbook.md`
- **실행 결과**: API 직접 호출(Scenario A), 캐시 동작(Scenario B), 프론트 통합(Scenario C) 검증 완료.
- **참조**: 상세 실행 방법 및 트러블슈팅은 위 런북 파일 참조.

---

## 6. 리스크 및 주의사항

- **모델 지연**: 실제 API 모드에서 아이콘 생성에 15~20초 소요될 수 있음 (UI에서 로딩 인디케이터로 대응).
- **생성 실패**: 안전 차단 등으로 생성 실패 시 기본 placeholder(📦)로 안전하게 폴백됨.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **CP-MVP-03**: 10분 데모 루프에서 동적 아이콘 생성 확인.
2. **U-081**: UI 레이아웃 정제 작업 시 인벤토리 영역 가시성 재점검.

### 7.2 의존 단계 확인

- **선행 단계**: U-011 (Inventory), U-035 (rembg) 완료됨.
- **후속 단계**: MMP (고해상도 에디션 지원).

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지 (0~1000 규약 등)
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
