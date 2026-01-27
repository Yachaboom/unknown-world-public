# U-045[Mvp]: Backend 시작 시 rembg/모델 사전 점검 + 다운로드(preflight)

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-045[Mvp] |
| Phase     | MVP        |
| 예상 소요 | 45분       |
| 의존성    | U-035      |
| 우선순위  | High       |

## 작업 목표

백엔드 서버 시작 시점에 `rembg` 설치 여부와 모델 캐시를 사전 점검하고, 필요한 경우 모델을 미리 다운로드하여
**첫 rembg 호출에서 발생하는 100~200MB 다운로드/지연**을 “턴 처리 경로”에서 제거한다.

**배경**: U-035로 런타임 rembg 후처리가 통합되었지만, rembg는 첫 실행 시 모델 자동 다운로드가 발생할 수 있어(Windows/배포 환경에서 특히), 이미지 생성/후처리 응답이 예측 불가능하게 느려지거나 실패할 수 있다. (가이드: `vibe/ref/rembg-guide.md`)

**완료 기준**:

- 서버 부팅 시 preflight가 1회 실행되어 rembg/모델 준비 상태를 판정한다.
- 모델이 없으면 `rembg d <model>`을 통해 다운로드를 시도하고, 성공/실패가 로그 및 상태(health)에 반영된다.
- 네트워크/권한 문제 등으로 preflight가 실패해도 서비스는 중단되지 않고, 이미지 후처리(rembg)는 **안전 폴백(원본 유지)** 으로 수렴한다. (RULE-004)
- `/health`(또는 기존 상태 엔드포인트)에서 rembg 준비 상태를 확인할 수 있다(예: installed, preloaded_models, missing_models, last_error).

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/services/rembg_preflight.py` - rembg 설치/모델 캐시 점검 + 다운로드(서브프로세스) 유틸

**수정**:

- `backend/src/unknown_world/main.py` - FastAPI lifespan/startup에서 preflight 실행 + 결과를 `app.state`에 저장
- `backend/src/unknown_world/services/image_postprocess.py` - preflight 상태를 참조해 “요청 경로에서 모델 다운로드”가 발생하지 않도록 가드(실패 시 즉시 원본 반환)
- (테스트) `backend/tests/unit/test_image_postprocess.py` - rembg 미준비/실패 시 원본 폴백 인바리언트 검증

**참조**:

- `vibe/ref/rembg-guide.md` - `rembg d <model>` 및 모델 선택(SSOT)
- `vibe/tech-stack.md` - rembg 버전 고정 및 런타임 사용 범위
- `.cursor/rules/00-core-critical.mdc` - RULE-004(폴백), RULE-008(텍스트 우선 원칙과 병행)

## 구현 흐름

### 1단계: preflight 정책(모델 목록/동작) 확정

- 기본 prefetch 모델을 최소 1개로 고정한다(권장: `birefnet-general`).
- 확장 모델 목록은 환경변수로 주입 가능하게 한다(예: `UW_REMBG_PREFETCH_MODELS=birefnet-general,birefnet-portrait`).
- preflight는 “실패해도 서비스는 계속”이 원칙이며, 실패 시 **기능만 비활성화**한다.

### 2단계: rembg 설치/모델 캐시 점검 + 다운로드 구현

- 설치 점검: `import rembg` 또는 `python -m rembg` 실행 가능 여부 확인.
- 모델 점검/다운로드:
  - 모델이 없으면 `rembg d <model>` 실행(가이드 준수).
  - 다운로드 결과/에러 메시지는 내부 상태로 기록하되, 민감정보/경로는 최소화한다.

### 3단계: 서버 부팅에 연결(Startup/Lifespan)

- `main.py`의 lifespan에서 preflight를 실행하고 결과를 `app.state.rembg_status` 같은 형태로 저장한다.
- 부팅이 너무 오래 걸릴 수 있으면(네트워크 환경), “짧은 타임아웃 + 실패 시 degraded 모드”로 시작한다(턴 처리 경로를 보호).

### 4단계: 런타임 후처리 경로 가드

- `image_postprocess.py`에서 preflight가 실패/미완료인 경우:
  - rembg를 호출하지 않고 즉시 원본을 반환(또는 `remove_background=false`로 강제)한다.
- preflight가 성공한 경우에만 rembg 실행을 허용해 “요청 중 다운로드”를 차단한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-035[Mvp]](U-035[Mvp].md) - rembg 후처리 통합(원본 폴백 인바리언트)
- **결과물**: `backend/src/unknown_world/services/image_postprocess.py`(현 rembg 래퍼), `vibe/ref/rembg-guide.md`(모델 SSOT)

**다음 작업에 전달할 것**:

- CP-MVP-05에서 “rembg 지연/실패”가 턴 경험을 깨지 않도록 하는 운영 기준선(사전 점검/가드)
- 배포(MMP)에서 이미지 후처리 준비 상태를 관측/진단할 수 있는 health 시그널

## 주의사항

**기술적 고려사항**:

- 모델 다운로드는 네트워크/권한/경로(Windows 한글 경로) 영향이 크다 → 실패는 정상 경로로 처리하고, 폴백으로 수렴해야 한다.
- preflight는 로그만으로 끝나지 말고, health에 노출되어 운영/디버그가 가능해야 한다.

**잠재적 리스크**:

- 서버 시작 시간이 과도하게 늘어남 → “타임아웃 + degraded 모드”로 시작하고, 필요 시 별도 수동 커맨드로 prefetch 수행

## 페어링 질문 (결정 필요)

- [x] **Q1**: 부팅 시 preflight를 얼마나 강하게 할까?
  - Option A: 타임아웃 짧게 + 실패 시 degraded(권장: 데모 루프 보호)
  - Option B: 다운로드 완료까지 부팅을 블로킹(첫 사용 지연은 제거되지만, 부팅 실패/지연 리스크↑)
  **A1**: Option A

- [x] **Q2**: 기본 prefetch 모델은 무엇으로 고정할까?
  - Option A: `birefnet-general`만(권장: 범용/안정)
  - Option B: `birefnet-general` + 인물용 1종(예: `birefnet-portrait`)까지
  **A2**: Option A

## 참고 자료

- `vibe/ref/rembg-guide.md` - 모델 다운로드/선택(SSOT)
- `backend/src/unknown_world/services/image_postprocess.py` - rembg 후처리 래퍼
- `backend/tests/manual_test_rembg.py` - 수동 검증 스크립트(있다면 참고)

