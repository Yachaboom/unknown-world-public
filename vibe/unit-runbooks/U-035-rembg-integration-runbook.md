# U-035[Mvp] 실시간 이미지 생성 시 rembg 배경 제거 통합 실행 가이드

## 1. 개요

실시간 게임 진행 중 생성되는 오브젝트/아이템 이미지에 대해 `rembg`를 사용한 **배경 제거 파이프라인**을 통합했습니다. 이미지 유형 힌트에 따라 최적의 rembg 모델을 자동 선택하며, 실패 시 원본 이미지를 반환하는 안전한 폴백을 제공합니다.

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-019[Mvp] (이미지 생성 엔드포인트), U-020[Mvp] (프론트 이미지 Lazy Render)
- 선행 완료 필요: 백엔드 서버 실행 가능 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 의존성 설치 (rembg 포함)
cd backend
pip install -r requirements.txt

# rembg 설치 확인
rembg --version
# 출력 예: rembg 2.0.72

# rembg 모델 사전 다운로드 (선택, 첫 실행 시 자동 다운로드됨)
rembg d birefnet-general
rembg d isnet-anime
rembg d birefnet-portrait
```

### 2.2 의존 유닛 확인

```bash
# 백엔드 서버가 실행 중인지 확인
curl http://localhost:8011/health
# 또는 Python 모듈 import 테스트
cd backend
python -c "from unknown_world.services.image_generation import get_image_generator; print('OK')"
python -c "from unknown_world.services.image_postprocess import get_image_postprocessor; print('OK')"
```

### 2.3 즉시 실행 (테스트 스크립트)

```bash
cd backend
python tests/manual_test_rembg.py
```

### 2.4 첫 화면/결과 확인

- 모든 테스트가 `[PASS]`로 표시되면 성공
- 성공 지표: `[OK] All tests passed!` 메시지 출력

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 모델 자동 선택 테스트

**목적**: 이미지 유형 힌트에 따라 올바른 rembg 모델이 선택되는지 검증

**실행**:

```bash
cd backend
python tests/manual_test_rembg.py
```

**기대 결과**:

| 힌트 | 선택 모델 | Alpha Matting |
|------|-----------|---------------|
| `object` | birefnet-general | False |
| `icon` | birefnet-general | False |
| `character` | isnet-anime | False |
| `anime` | isnet-anime | False |
| `portrait` | birefnet-portrait | True |
| `human` | u2net_human_seg | True |
| (없음) | birefnet-general | False |

**확인 포인트**:
- ✅ 모든 힌트에 대해 올바른 모델이 선택됨
- ✅ alpha_matting 옵션이 적절히 설정됨

---

### 시나리오 B: 스키마 확장 테스트

**목적**: `ImageJob` 및 `ImageGenerationRequest`에 새 필드가 추가되었는지 검증

**실행**:

```bash
cd backend
python -c "
from unknown_world.models.turn import ImageJob
from unknown_world.services.image_generation import ImageGenerationRequest

job = ImageJob(should_generate=True, remove_background=True, image_type_hint='object')
print(f'ImageJob.remove_background: {job.remove_background}')
print(f'ImageJob.image_type_hint: {job.image_type_hint}')

req = ImageGenerationRequest(prompt='test', remove_background=True, image_type_hint='icon')
print(f'Request.remove_background: {req.remove_background}')
print(f'Request.image_type_hint: {req.image_type_hint}')
"
```

**기대 결과**:

```
ImageJob.remove_background: True
ImageJob.image_type_hint: object
Request.remove_background: True
Request.image_type_hint: icon
```

**확인 포인트**:
- ✅ `remove_background` 필드가 `True`로 설정 가능
- ✅ `image_type_hint` 필드가 문자열로 설정 가능

---

### 시나리오 C: rembg 실제 배경 제거 테스트

**목적**: 실제 이미지에 대한 배경 제거 동작 검증

**전제 조건**:
- rembg가 설치되어 있음
- 테스트용 이미지 파일이 있음

**실행**:

```bash
cd backend
python -c "
from pathlib import Path
from unknown_world.services.image_postprocess import get_image_postprocessor

# 테스트용 이미지 경로 (실제 이미지로 대체)
# 예: generated_images 폴더에 있는 이미지
postprocessor = get_image_postprocessor()
print(f'rembg available: {postprocessor.is_available()}')

# 실제 테스트 (이미지가 있을 경우)
# result = postprocessor.remove_background(
#     input_path=Path('generated_images/test.png'),
#     image_type_hint='object'
# )
# print(f'Status: {result.status}')
# print(f'Model used: {result.model_used}')
"
```

**확인 포인트**:
- ✅ `rembg available: True` 출력
- ✅ 배경 제거 시 `_nobg.png` 파일 생성

---

### 시나리오 D: 프론트엔드 Zod 스키마 동기화 테스트

**목적**: 프론트엔드 Zod 스키마에 새 필드가 추가되었는지 검증

**실행**:

```bash
cd frontend
pnpm run typecheck
```

**기대 결과**:
- 타입 체크 성공 (오류 없음)

**확인 포인트**:
- ✅ `ImageJobSchema`에 `remove_background` 필드 존재
- ✅ `ImageJobSchema`에 `image_type_hint` 필드 존재

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 콘솔 출력 또는 백엔드 로그
- 주요 로그 메시지:
  - `[ImageGen] 이미지 배경 제거 완료`: 성공
  - `[ImageGen] 이미지 배경 제거 실패, 원본 사용`: 실패 시 폴백
  - `[Rembg] 배경 제거 시작`: 처리 시작
  - `[Rembg] 배경 제거 완료`: 처리 완료

### 4.2 생성 파일

- `generated_images/{image_id}.png`: 원본 이미지
- `generated_images/{image_id}_nobg.png`: 배경 제거된 이미지

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 모든 테스트 통과
- ✅ rembg 사용 가능
- ✅ 모델 자동 선택 동작
- ✅ 배경 제거 시 `_nobg.png` 파일 생성

**실패 시 확인**:
- ❌ rembg 미설치 → `pip install rembg` 실행
- ❌ 모델 다운로드 실패 → `rembg d <model>` 실행
- ❌ 타임아웃 → 이미지 크기가 너무 큰 경우 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `rembg: command not found`
- **원인**: rembg가 설치되지 않음
- **해결**: `pip install rembg`

**오류**: `Model not found`
- **원인**: rembg 모델이 다운로드되지 않음
- **해결**: `rembg d birefnet-general` 실행

**오류**: 배경 제거 타임아웃
- **원인**: 이미지가 너무 크거나 시스템 리소스 부족
- **해결**: 이미지 크기 축소 또는 타임아웃 값 증가

**오류**: 원본 이미지 반환 (폴백)
- **원인**: rembg 처리 실패
- **해결**: 로그에서 상세 오류 메시지 확인

### 5.2 환경별 주의사항

- **Windows**: 한글 경로 사용 시 오류 발생 가능 → 영문 경로 권장
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

- U-022[Mvp]: Scanner 슬롯에서 사용자 업로드 이미지 → 아이템화 시 동일 rembg 파이프라인 재사용
- MMP U-103: 이미지 편집에서 rembg 후처리 확장
