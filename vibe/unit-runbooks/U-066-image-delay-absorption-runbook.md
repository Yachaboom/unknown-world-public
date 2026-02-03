# U-066[Mvp] 이미지 생성 지연 흡수 플로우 실행 가이드

## 1. 개요

이미지 생성이 10~20초 이상 지연되더라도 "멈춤/실패"로 느껴지지 않게, **텍스트는 계속 진행되고 이미지는 적절한 타이밍에 자연스럽게 도착**하는 UX 플로우를 구현했습니다.

핵심 기능:
- **타이핑(Typewriter) 효과**: 내러티브 텍스트가 한 글자씩 표시되며 지연 시간 흡수
- **모델 티어링**: FAST(gemini-2.5-flash-image) / QUALITY(gemini-3-pro-image-preview) 선택
- **Late-binding 이미지**: 턴과 분리된 비동기 이미지 생성 + turn_id 가드

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-065[Mvp] (TurnOutput 스키마 단순화), U-020[Mvp] (Lazy Render), U-055[Mvp] (이미지 파이프라인)
- 선행 완료 필요: 백엔드/프론트엔드 서버 실행

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프로젝트 루트에서 의존성 설치
cd /path/to/unknown-world
pnpm install
```

### 2.2 서버 시작

```bash
# 백엔드 서버 시작 (포트 8011)
pnpm run dev:back

# 프론트엔드 서버 시작 (포트 8001)
pnpm run dev:front
```

### 2.3 즉시 실행

브라우저에서 http://localhost:8001 접속

### 2.4 첫 화면 확인

- 프로필 선택 화면 표시
- "서사꾼", "탐험가", "기술 전문가" 프로필 카드 확인

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 타이핑 효과 확인

**목적**: 내러티브 텍스트의 타이핑 효과 동작 검증

**실행**:
1. 프로필 선택 후 게임 시작
2. 하단 액션 카드("탐색하기" 등) 클릭

**기대 결과**:
- 내러티브 피드에서 텍스트가 한 글자씩 타이핑되며 표시
- 타이핑 중 커서(▌)가 깜빡임
- 클릭/Enter/Space로 즉시 전체 표시(Fast-forward)

**확인 포인트**:
- ✅ 스트리밍 중: 느린 타이핑 속도 (~12초 목표)
- ✅ 유휴 상태: 빠른 타이핑 속도 (~2.5초 목표)
- ✅ Fast-forward 동작 확인

---

### 시나리오 B: 이미지 로딩 인디케이터 확인

**목적**: 이미지 생성 중 로딩 상태 표시 검증

**실행**:
1. 이미지 생성을 트리거하는 턴 실행 (Real 모드에서)
2. Scene Canvas 영역 관찰

**기대 결과**:
- Scene Canvas에 "새 장면 생성 중..." 인디케이터 표시
- 이전 이미지 유지 (있는 경우)
- 이미지 도착 시 페이드 인 전환

**확인 포인트**:
- ✅ `imageLoading` 상태에서 로딩 인디케이터 표시
- ✅ 이전 이미지 유지 (Option A 정책)
- ✅ 실패 시 이전 이미지로 폴백

---

### 시나리오 C: 모델 티어링 확인 (백엔드 로그)

**목적**: FAST/QUALITY 모델 선택 검증

**실행**:
```bash
# 백엔드 로그 확인
# UW_MODE=real 환경에서 이미지 생성 시 로그 확인
```

**기대 결과**:
- `model_label=FAST` 요청 시: `gemini-2.5-flash-image` 사용
- `model_label=QUALITY` 요청 시: `gemini-3-pro-image-preview` 사용

**확인 포인트**:
- ✅ 로그에 `model_label` 및 `model` 필드 출력
- ✅ 모델 ID가 tech-stack.md와 일치

---

### 시나리오 D: Late-binding 가드 확인

**목적**: 이전 턴의 이미지가 새 턴을 덮어쓰지 않는지 검증

**실행**:
1. 턴 A 실행 (이미지 생성 시작)
2. 빠르게 턴 B 실행 (새 턴 시작)
3. 턴 A의 이미지 도착 시 반영 여부 확인

**기대 결과**:
- 턴 A의 이미지는 무시됨 (turn_id 불일치)
- 턴 B의 이미지만 반영됨

**확인 포인트**:
- ✅ `pendingImageTurnId`와 `turnId` 비교
- ✅ 불일치 시 `applyLateBindingImage` 반환값 `false`

---

### 시나리오 E: 접근성 확인

**목적**: prefers-reduced-motion 설정 존중 검증

**실행**:
1. OS/브라우저에서 "동작 줄이기" 설정 활성화
2. 게임 플레이

**기대 결과**:
- 타이핑 효과 비활성화 (즉시 전체 표시)
- 애니메이션 최소화

**확인 포인트**:
- ✅ `prefersReducedMotion` 상태 감지
- ✅ 타이핑 효과 스킵

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- **프론트엔드**: 브라우저 콘솔
- **백엔드**: 터미널 출력
  - `[ImageGen]` 프리픽스로 이미지 생성 로그 확인
  - `prompt_hash`, `model_label`, `elapsed_ms` 필드 확인

### 4.2 주요 지표

- 타이핑 속도: MIN_CPS(10) ~ MAX_CPS(400) 범위
- 스트리밍 중 목표 시간: ~12초
- 유휴 상태 목표 시간: ~2.5초

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 타이핑 효과가 부드럽게 동작
- ✅ Fast-forward가 즉시 반응
- ✅ 이미지 로딩 중 이전 이미지 유지
- ✅ Late-binding 가드가 올바르게 작동

**실패 시 확인**:
- ❌ 타이핑이 너무 빠름/느림 → CPS 상수 조정 필요
- ❌ 이미지가 잘못된 턴에 표시 → turn_id 가드 확인
- ❌ 로딩 인디케이터 미표시 → `imageLoading` 상태 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 타이핑 효과가 동작하지 않음
- **원인**: `NarrativeFeed`에 `isStreaming`/`isImageLoading` prop 미전달
- **해결**: App.tsx에서 prop 전달 확인

**오류**: 이미지가 표시되지 않음
- **원인**: Late-binding 가드에서 turn_id 불일치
- **해결**: `pendingImageTurnId`와 요청 `turnId` 일치 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 주의 (\ vs /)
- **Mock 모드**: `UW_MODE=mock`에서는 플레이스홀더 이미지만 생성

---

## 6. 구현 파일 목록

### 생성된 파일

| 파일 | 목적 |
| ---- | ---- |
| `frontend/src/api/image.ts` | 이미지 생성 API 클라이언트 |

### 수정된 파일

| 파일 | 변경 내용 |
| ---- | --------- |
| `backend/src/unknown_world/config/models.py` | IMAGE_FAST 모델 라벨 추가 |
| `backend/src/unknown_world/api/image.py` | model_label/turn_id 파라미터 추가 |
| `backend/src/unknown_world/services/image_generation.py` | 모델 티어링 로직 구현 |
| `frontend/src/types/scene.ts` | sceneRevision 타입 추가 |
| `frontend/src/stores/worldStore.ts` | Late-binding 상태 관리 액션 추가 |
| `frontend/src/turn/turnRunner.ts` | 이미지 잡 비동기 실행 로직 추가 |
| `frontend/src/components/SceneImage.tsx` | isGenerating 로딩 인디케이터 추가 |
| `frontend/src/components/NarrativeFeed.tsx` | 타이핑 효과 구현 |
| `frontend/src/locales/*/translation.json` | i18n 키 추가 |

---

## 7. 참고 자료

- 계획서: `vibe/unit-plans/U-066[Mvp].md`
- 의존 유닛: `vibe/unit-results/U-065[Mvp].md`, `vibe/unit-results/U-020[Mvp].md`, `vibe/unit-results/U-055[Mvp].md`
- 기술 스택: `vibe/tech-stack.md` (모델 ID 참조)
