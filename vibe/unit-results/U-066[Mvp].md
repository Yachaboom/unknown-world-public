# U-066[Mvp]: 이미지 생성 지연 흡수 플로우 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-066[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-03 14:30
- **담당**: AI Agent

---

## 1. 작업 요약

이미지 생성 지연(10~20초)이 사용자 경험을 저해하지 않도록, **타이핑 효과를 통한 지연 시간 흡수**, **비동기 Late-binding 이미지 로딩**, 그리고 **모델 티어링(FAST/QUALITY)**을 결합한 통합 UX 플로우를 구현했습니다.

---

## 2. 작업 범위

- **타이핑(Typewriter) 효과 구현**: `NarrativeFeed`에 가변 속도 타이핑 엔진 적용 (스트리밍/로딩 중 속도 저하로 시간 벌기)
- **비동기 이미지 파이프라인 통합**: `turnRunner`에서 턴 스트리밍 종료 후 별도의 이미지 생성 잡 실행 구조 구축
- **Late-binding 이미지 가드**: `turn_id` 및 `sceneRevision`을 활용하여 턴 불일치 이미지 반영 방지
- **모델 티어링 (FAST/QUALITY)**: `gemini-2.5-flash-image`(FAST)와 `gemini-3-pro-image-preview`(QUALITY) 선택 로직 백엔드 통합
- **이전 이미지 유지 정책(Option A)**: 새 이미지 로딩 중 이전 이미지를 유지하고 로딩 인디케이터 표시

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/components/NarrativeFeed.tsx` | 수정 | 타이핑 효과 및 가변 CPS 로직 구현 |
| `frontend/src/turn/turnRunner.ts` | 수정 | 비동기 이미지 잡 실행 및 Abort 제어 로직 추가 |
| `frontend/src/stores/worldStore.ts` | 수정 | Late-binding 이미지 상태 및 revision 가드 액션 추가 |
| `frontend/src/api/image.ts` | 수정 | 모델 라벨 및 턴 ID 파라미터 대응 |
| `frontend/src/components/SceneImage.tsx` | 수정 | 이미지 로딩 인디케이터 및 페이드 인 연출 추가 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | `IMAGE_FAST` 모델 라벨 및 티어링 로직 구현 |
| `backend/src/unknown_world/api/image.py` | 수정 | `model_label`, `turn_id` 파라미터 수신 및 응답 확장 |
| `backend/src/unknown_world/config/models.py` | 수정 | `gemini-2.5-flash-image` 모델 ID 등록 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**타이핑 엔진 (`useTypewriter`):**
- **가변 CPS**: `shouldBuyTime` (스트리밍/로딩 중) 여부에 따라 목표 소요 시간을 설정하여 글자당 노출 속도 자동 조절.
- **Fast-forward**: 클릭이나 특정 키(Enter/Space) 입력 시 즉시 전체 텍스트 노출.
- **Reduced Motion**: OS 수준의 동작 줄이기 설정을 감지하여 타이핑 효과 자동 비활성화.

**Late-binding 가드 로직:**
- `worldStore.setImageLoading(turnId)`: 이미지 생성 요청 시 현재 턴 ID를 마킹.
- `worldStore.applyLateBindingImage(url, turnId)`: 이미지가 도착했을 때 스토어의 `pendingImageTurnId`와 일치하는지 검증하여 적용.

### 4.2 외부 영향 분석

- **UX/UI**: 텍스트가 바로 나오지 않고 타이핑되므로 정보 전달 속도는 늦어지나, 시스템이 "동작 중"이라는 인식이 강화됨.
- **API 비용**: 모델 티어링을 통해 중요도가 낮은 프리뷰 단계에서 FAST 모델을 사용하여 비용 효율화 기반 마련.

### 4.3 가정 및 제약사항

- 이미지 생성 타임아웃은 백엔드에서 60~300초로 설정되어 있으나, 프론트엔드는 사용자 인내심을 고려하여 타이핑 속도를 최대 30초 내외로 조절함.
- `turn_id` 불일치로 버려지는 이미지는 백엔드 로그에는 남지만 프론트엔드에서는 무시됨.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-066-image-delay-absorption-runbook.md`
- **실행 결과**: 타이핑 효과, Fast-forward, 이전 이미지 유지, Late-binding 가드 시나리오 검증 완료.

---

## 6. 리스크 및 주의사항

- **타이핑 속도 체감**: 텍스트가 너무 길 경우 타이핑이 지나치게 느려질 수 있으므로 CPS 하한선(`MIN_CPS=3`)을 설정함.
- **턴 전이**: 턴이 매우 빠르게 넘어갈 경우 이전 이미지들이 무시되면서 리소스 낭비가 발생할 수 있음 (MMP에서 캐싱으로 최적화 예정).

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-067[Mvp]**: Vertex AI Production 설정 수정 (인증 및 리전 최적화)
2. **U-068[Mvp]**: 이전 턴 이미지 참조를 통한 시각적 일관성 강화

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---
_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
