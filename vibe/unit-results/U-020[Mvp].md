# [U-020[Mvp]] 프론트 이미지 Lazy Render(placeholder/폴백) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-020[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-25 23:55
- **담당**: AI Agent

---

## 1. 작업 요약

프론트엔드 `SceneCanvas`의 이미지를 지연 렌더링(Lazy Render)하고, 로딩 및 에러 상황에서도 사용자 경험을 유지할 수 있도록 플레이스홀더 및 이전 이미지 유지(Option A) 로직을 구현했습니다. 텍스트 정보가 이미지보다 먼저 제공되도록 보장하며, 이미지 실패 시에도 핫스팟 인터랙션이 중단되지 않는 구조를 확립했습니다.

---

## 2. 작업 범위

- **SceneImage 컴포넌트 추출**: `SceneCanvas`에서 이미지 렌더링 로직을 분리하여 `SceneImage.tsx`로 모듈화
- **Lazy Loading 구현**: 새로운 이미지 URL 수신 시 백그라운드에서 프리로드 후 완료 시점에 교체(Fade-in)
- **Option A 정책 적용**: 새로운 이미지 로딩 중에도 이전 장면 이미지를 유지하여 화면 깜빡임 최소화
- **에러/상태 폴백**: 이미지 로드 실패 시 에러 배지 표시 및 `U-031` 플레이스홀더로 안전하게 복귀
- **Zod 스키마 보완**: 백엔드에서 `scene` 정보가 null로 올 수 있는 케이스를 대응하기 위해 `UIOutputSchema` 수정
- **i18n 메시지 추가**: "이미지 로딩 중...", "이미지 생성 중..." 등 상태 메시지 다국어화

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/components/SceneImage.tsx` | 신규 | 이미지 Lazy 로딩 및 상태 표시 전담 컴포넌트 |
| `frontend/src/components/SceneCanvas.tsx` | 수정 | `SceneImage` 통합 및 핫스팟 레이어와 이미지 로직 분리 |
| `frontend/src/schemas/turn.ts` | 수정 | `UIOutput.scene` 필드의 null 허용(`nullish`) 및 기본값 처리 |
| `frontend/src/style.css` | 수정 | 로딩 스피너, 에러 배지, 페이드인 애니메이션 스타일 추가 |
| `frontend/src/types/scene.ts` | 수정 | `ImageLoadingState` 타입 추가 및 `SceneCanvasState` 확장 |
| `frontend/src/locales/*/translation.json` | 수정 | 이미지 로딩 관련 다국어 키 추가 |
| `frontend/src/components/SceneImage.test.tsx` | 신규 | Lazy 로딩 및 폴백 시나리오 단위 테스트 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:
- `SceneImage({ status, imageUrl, message })`: `status`에 따라 플레이스홀더 또는 실제 이미지를 렌더링하며, `imageUrl` 변경 시 비동기 프리로드를 수행합니다.
- **Option A (Persistent Image)**: 새로운 이미지가 완전히 로드될 때까지 `displayImageUrl`을 이전 값으로 유지하여 유저가 빈 화면을 보지 않도록 합니다.

**설계 패턴/원칙**:
- **텍스트 우선 (RULE-008)**: 이미지가 생성/로딩되는 동안에도 `narrative` 및 `stage` 이벤트는 즉시 처리되어 유저에게 텍스트 피드백을 먼저 제공합니다.
- **Fail-safe (RULE-004)**: 이미지 로드 실패(`onerror`) 시 에러 배지를 노출하되, 기존 핫스팟 및 다른 UI 요소의 상호작용은 유지합니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 백엔드 `/api/image/generate` 엔드포인트에서 생성된 이미지 URL을 클라이언트에서 소비합니다.
- **UI/UX**: 이미지 로딩 중 하단에 "Loading scene image..." 인디케이터와 프로그레스 바 애니메이션이 노출됩니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-020-image-lazy-render-runbook.md`
- **실행 결과**:
    - 시나리오 A (Placeholder): 이미지 없는 턴에서 정상 표시 확인
    - 시나리오 C (Option A): 이전 이미지 유지 및 페이드인 전환 확인
    - 시나리오 D (Error): 이미지 로드 실패 시 에러 배지 및 폴백 확인
- **참조**: 상세 테스트 절차는 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **네트워크 지연**: 고용량 이미지의 경우 텍스트와 이미지 간의 시간차가 발생할 수 있으나, 로딩 인디케이터로 인지적 간극을 해소했습니다.
- **캐싱 정책**: 동일 URL에 대한 반복 요청 시 브라우저 캐시를 활용하도록 설계되었습니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-035[Mvp]**: 실시간 이미지 생성 시 `rembg` 배경 제거 파이프라인 통합
2. **CP-MVP-05**: 체크포인트 - 멀티모달 이미지 게이트 검증

### 7.2 의존 단계 확인

- **선행 단계**: U-010, U-019 (완료)
- **후속 단계**: U-035, U-036, CP-MVP-05 (로드맵 참조)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항(Lazy loading, Placeholder) 충족 확인
- [x] Repomix 최신 구조(`SceneImage` 분리) 반영 확인
- [x] RULE-004/008/009 인바리언트 준수
- [x] 단위 테스트(`SceneImage.test.tsx`)를 통한 로직 검증 완료

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
