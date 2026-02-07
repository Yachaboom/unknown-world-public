# U-091 런타임 rembg 파이프라인 일괄 제거 실행 가이드

## 1. 개요

서버 런타임에서 rembg(배경 제거) 파이프라인을 완전히 제거하여 서버 시작 시간 단축, 의존성 단순화, 런타임 안정성 향상을 달성했습니다. 배경 제거가 필요한 에셋은 개발 시점(Dev-only)에서 처리하거나 프리셋 이미지를 활용합니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-035[Mvp] (rembg 런타임 통합), U-045[Mvp] (rembg preflight), U-075[Mvp] (아이콘 생성)
- 선행 완료 필요: 없음 (제거 작업이므로 기존 유닛의 역할을 대체)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd d:\Dev\unknown-world\backend
uv sync
```

```bash
cd d:\Dev\unknown-world\frontend
pnpm install
```

### 2.2 제거 대상 확인

다음 파일이 삭제되었는지 확인합니다:

- `backend/src/unknown_world/services/image_postprocess.py` (삭제됨)
- `backend/src/unknown_world/services/rembg_preflight.py` (삭제됨)
- `backend/tests/manual_test_rembg.py` (삭제됨)
- `backend/tests/unit/test_image_generation_integration.py` (삭제됨)
- `backend/tests/unit/test_image_postprocess.py` (삭제됨)
- `backend/tests/unit/services/test_rembg_preflight.py` (삭제됨)

### 2.3 즉시 실행

```bash
# Backend (포트 8011)
cd d:\Dev\unknown-world\backend
uv run uvicorn src.unknown_world.main:app --reload --port 8011
```

```bash
# Frontend (포트 8001)
cd d:\Dev\unknown-world\frontend
pnpm dev
```

### 2.4 첫 화면/결과 확인

서버 시작 로그에서 다음을 확인합니다:

1. **rembg preflight 미실행**: `[Startup] rembg preflight` 관련 로그가 없어야 합니다.
2. **즉시 시작**: `Application startup complete.` 메시지가 즉시(1초 이내) 나타나야 합니다.
3. **이전**: rembg 모델 다운로드/체크로 수초~수십초 소요
4. **이후**: 즉시 시작 완료

---

## 3. 수동 테스트 시나리오

### 시나리오 1: Health 엔드포인트 확인

**목적**: `/health` 응답에 rembg 관련 필드가 없는지 확인

```bash
curl -s http://localhost:8011/health | python -m json.tool
```

**기대 결과**:

```json
{
    "status": "ok",
    "version": "0.1.0",
    "service": "unknown-world-backend"
}
```

**확인 포인트**:

- `rembg` 필드가 응답에 포함되지 않아야 함
- `status`는 "ok"이어야 함

### 시나리오 2: OpenAPI 스키마 검증

**목적**: API 스키마에서 rembg 관련 모델이 제거되었는지 확인

```bash
curl -s http://localhost:8011/openapi.json | python -c "
import sys, json
spec = json.load(sys.stdin)
schemas = spec.get('components',{}).get('schemas',{})
rembg_schemas = [k for k in schemas if 'rembg' in k.lower() or 'Rembg' in k]
print('rembg 관련 스키마:', rembg_schemas if rembg_schemas else '없음 (정상)')
"
```

**기대 결과**: `rembg 관련 스키마: 없음 (정상)`

### 시나리오 3: 이미지 생성 서비스 정상 동작

**목적**: rembg 제거 후 이미지 생성이 정상적으로 작동하는지 확인

```bash
curl -s http://localhost:8011/api/image/health | python -m json.tool
```

**기대 결과**:

```json
{
    "status": "ok",
    "available": true,
    "mode": "mock" 또는 "real",
    "model": "gemini-3-pro-image-preview"
}
```

### 시나리오 4: 게임 턴 실행 확인

**목적**: 전체 파이프라인이 rembg 없이 정상 동작하는지 확인

1. 브라우저에서 `http://localhost:8001` 접속
2. 하단 입력란에 명령 입력 후 실행
3. Agent Console에서 모든 단계(Parse→Commit)가 정상 완료되는지 확인
4. 검증 배지에 `schema_ok`가 표시되는지 확인
5. 콘솔(F12)에 에러가 없는지 확인

### 시나리오 5: 아이콘 생성 확인

**목적**: ItemIconGenerator가 rembg 없이 정상 동작하는지 확인

게임 플레이 중 인벤토리에 새 아이템이 추가될 때:

1. 아이템 아이콘이 정상적으로 표시되는지 확인
2. 프롬프트 기반 어두운 배경이 적용되는지 확인 (배경 제거 대신)

---

## 4. 자동 테스트

### 4.1 백엔드 테스트

```bash
cd d:\Dev\unknown-world\backend
uv run pytest tests/ -v
```

**기대 결과**: 260개 전체 통과 (rembg 관련 테스트 삭제됨)

### 4.2 프론트엔드 테스트

```bash
cd d:\Dev\unknown-world\frontend
pnpm test -- --run
```

**기대 결과**: 241개 전체 통과

### 4.3 린트/타입체크

```bash
cd d:\Dev\unknown-world\backend
uv run ruff check src/unknown_world/
uv run pyright src/unknown_world/
```

```bash
cd d:\Dev\unknown-world\frontend
pnpm run lint
pnpm run typecheck
```

**기대 결과**: 모두 오류 없음

---

## 5. 제거된 코드 요약

### 백엔드 삭제 파일

| 파일 | 역할 |
|------|------|
| `services/image_postprocess.py` | rembg 배경 제거 후처리 |
| `services/rembg_preflight.py` | rembg 모델 다운로드/사전 점검 |
| `tests/manual_test_rembg.py` | rembg 수동 테스트 |
| `tests/unit/test_image_generation_integration.py` | rembg 통합 테스트 |
| `tests/unit/test_image_postprocess.py` | 후처리 테스트 |
| `tests/unit/services/test_rembg_preflight.py` | preflight 테스트 |

### 제거된 모델 필드

| 모델 | 제거된 필드 |
|------|------------|
| `HealthResponse` | `rembg: RembgHealthInfo` |
| `ImageGenerationRequest` | `remove_background`, `image_type_hint` |
| `ImageGenerationResponse` | `background_removed`, `rembg_model_used` |
| `ImageJob` (turn.py) | `remove_background`, `image_type_hint` |
| `RenderOutput` (turn.py) | `background_removed` |
| `ImageJobSchema` (turn.ts) | `remove_background`, `image_type_hint` |
| `RenderOutputSchema` (turn.ts) | `background_removed` |

### 제거된 런타임 동작

| 동작 | 이전 | 이후 |
|------|------|------|
| 서버 시작 | rembg 모델 다운로드 + 체크 | 즉시 시작 |
| 이미지 생성 후 | rembg 배경 제거 후처리 | 바로 저장 |
| 아이콘 생성 | `_nobg.png` 파일 우선 검색 | 원본 `.png` 사용 |
| Health 응답 | rembg 상태 정보 포함 | 기본 상태만 포함 |

---

## 6. 트러블슈팅

### Q: 서버 시작 시 rembg 관련 import 에러가 발생합니다

A: `uv sync --reinstall-package unknown-world-backend`로 패키지를 재빌드합니다.

### Q: 이전 프로세스가 포트를 점유하고 있습니다

A: Windows에서 좀비 프로세스가 포트를 점유할 수 있습니다:

```bash
# 포트 확인
netstat -ano | grep ':8011'

# 프로세스 트리 종료
taskkill /F /T /PID <PID>
```

### Q: 프론트엔드에서 background_removed 관련 에러가 발생합니다

A: `pnpm run typecheck`으로 타입 호환성을 확인합니다. Zod 스키마에서 해당 필드가 제거되었는지 `frontend/src/schemas/turn.ts`를 확인합니다.

---

## 7. 되돌리기 (Rollback)

rembg 런타임을 복원해야 하는 경우:

1. Git에서 이 유닛 커밋 이전으로 되돌립니다
2. `uv sync --reinstall-package unknown-world-backend` 실행
3. `pnpm install` 실행
4. 백엔드/프론트엔드 서버 재시작

**참고**: U-091은 rembg를 런타임에서만 제거합니다. Dev-time 에셋 생성(nanobanana-mcp)에서의 rembg 사용은 영향받지 않습니다.
