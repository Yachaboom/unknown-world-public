# U-115[Mvp] 핫스팟 컴팩트 원형(Circle) 디자인 실행 가이드

## 1. 개요

핫스팟을 **bbox 사각형에서 컴팩트한 원형(Circle) 마커**로 변환하고, **1~3개 제한 + 우선순위/겹침 방지** 필터를 적용하여 핫스팟 UX 품질을 완성합니다.

**완료 기준**:
- 정밀분석 결과 핫스팟이 **1~3개로 제한**됨
- 핫스팟이 **bbox 중앙에 원형 마커**로 렌더링됨
- **펄스 애니메이션** 적용 (reduced-motion 시 정적 대체)
- **크기 기준 우선순위** 선택 + **겹침 방지** 자동 적용

**예상 소요 시간**: 5~10분

**의존성**:
- U-090[Mvp]: 핫스팟 정밀분석 전용 정책
- U-058[Mvp]: 핫스팟 기본 디자인
- 프론트엔드 + 백엔드(mock 모드) 개발 서버 실행 가능 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
cd frontend
pnpm install
```

### 2.2 개발 서버 실행

```bash
# 터미널 1: 프론트엔드 (포트 8001)
cd frontend
pnpm dev

# 터미널 2: 백엔드 Mock 모드 (포트 8011)
cd backend
UW_MODE=mock uv run uvicorn unknown_world.main:app --reload --port 8011
```

> **주의**: 기존 백엔드 프로세스가 8011 포트를 점유하고 있으면 `pnpm kill` 후 재시작합니다.

### 2.3 첫 화면/결과 확인

1. 브라우저에서 `http://localhost:8001` 접속
2. **탐험가** 프로필 선택
3. 게임이 로드되면 하단 명령 입력창에 `자세히 보기` 입력 후 실행
4. "ANALYZING SCENE..." 표시 후 장면 이미지 위에 **원형 핫스팟 3개** 표시 확인

---

## 3. 검증 시나리오

### 시나리오 1: 원형 핫스팟 기본 렌더링

**입력**: `자세히 보기` (또는 `look closely`) 명령 실행

**기대 결과**:
- 장면 이미지 위에 마젠타 색상의 **원형 마커** 3개 표시
- Mock 데이터 기준: "낡은 문", "벽에 걸린 횃불", "바닥의 금이 간 타일"
- 각 마커가 해당 오브젝트 bbox의 **중앙**에 위치
- 마커에 **펄스 애니메이션** (2초 주기로 크기/투명도 변화)

### 시나리오 2: 호버 툴팁

**입력**: 원형 마커 위에 마우스 호버

**기대 결과**:
- 펄스 애니메이션 정지, scale(1.2)로 확대
- 마커 위(또는 아래)에 **오브젝트 이름 + 상호작용 힌트** 툴팁 표시
- 예: "낡은 문" + "[대화 대상]"

### 시나리오 3: 핫스팟 클릭

**입력**: 원형 마커 클릭

**기대 결과**:
- 해당 오브젝트에 대한 턴 처리 시작 (TurnInput 전송)
- 턴 처리 중 모든 핫스팟 **비활성 상태** (grayscale + 클릭 불가)

### 시나리오 4: 개수 제한 확인

**확인 방법**: Mock 데이터는 정확히 3개를 반환하므로 화면에 최대 3개 표시

**기대 결과**:
- 핫스팟 3개 이하로 표시
- 내러티브에 핫스팟 이름 목록 포함: "... 낡은 문, 벽에 걸린 횃불, 바닥의 금이 간 타일이(가) 눈에 들어옵니다."

### 시나리오 5: 접근성 (Reduced Motion)

**확인 방법**: 브라우저 DevTools → Rendering → Emulate CSS media feature → `prefers-reduced-motion: reduce`

**기대 결과**:
- 펄스 애니메이션 없음
- 고정 glow(box-shadow)로 대체
- 호버 시 transition 없이 즉시 반응

---

## 4. 문제 해결 (Troubleshooting)

### 핫스팟이 표시되지 않는 경우

1. **백엔드 모드 확인**: 터미널에서 `[Startup] UW_MODE: mock` 출력 확인
2. **포트 충돌 확인**: `netstat -ano | findstr ":8011"` 로 다른 프로세스가 같은 포트를 점유하고 있지 않은지 확인
3. **비전 트리거 확인**: 명령어가 `자세히 보기`, `look closely`, `정밀분석` 중 하나인지 확인 (대소문자 무관)
4. **네트워크 응답 확인**: DevTools Network 탭에서 `/api/turn` 응답의 `ui.objects` 배열이 비어있지 않은지 확인

### 핫스팟이 사각형으로 표시되는 경우

- 프론트엔드 코드가 최신 상태인지 확인 (Vite HMR이 정상 작동하는지)
- `frontend/src/styles/hotspot.css`에서 `.hotspot-circle` 클래스가 존재하는지 확인
- 브라우저 캐시 강제 리프레시 (Ctrl+Shift+R)

---

## 5. 관련 파일

| 파일 | 역할 |
| --- | --- |
| `backend/src/unknown_world/orchestrator/stages/resolve.py` | `filter_hotspots()` 필터 로직 |
| `backend/prompts/vision/scene_affordances.ko.md` | 정밀분석 프롬프트 (한국어) |
| `backend/prompts/vision/scene_affordances.en.md` | 정밀분석 프롬프트 (영문) |
| `frontend/src/components/Hotspot.tsx` | 원형 마커 렌더링 컴포넌트 |
| `frontend/src/styles/hotspot.css` | 원형 마커 스타일/애니메이션 |
| `frontend/src/utils/box2d.ts` | Box2D 좌표 변환 유틸 |

---

_본 런북은 AI Agent에 의해 자동 생성되었습니다._
