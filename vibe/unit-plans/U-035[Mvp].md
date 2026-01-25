# U-035[Mvp]: 실시간 이미지 생성 시 rembg 배경 제거 통합

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-035[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-019,U-020 |
| 우선순위  | High        |

## 작업 목표

실시간 게임 진행 중 생성되는 **오브젝트/아이템 이미지**에 대해, 필요한 경우 `rembg`를 사용해 **배경을 제거**하여 투명 PNG로 제공할 수 있는 파이프라인을 구축한다.

**배경**: 게임 내 생성된 오브젝트/아이템이 Scene Canvas나 Inventory에서 "배경 없이" 자연스럽게 합성되어야 할 때, 생성 이미지의 불필요한 배경이 UX를 저해할 수 있다. 이를 위해 rembg를 **조건부 후처리** 파이프라인으로 통합한다.

**완료 기준**:

- 이미지 생성 요청(`render.image_job`)에 `remove_background` 옵션이 추가되고, 해당 플래그가 true일 때 백엔드에서 rembg 처리가 수행된다.
- rembg 모델 선택은 이미지 유형(오브젝트/캐릭터 등)에 따라 자동 선택되거나, 기본값(`u2net`)으로 동작한다.
- rembg 처리 실패 시에도 원본 이미지가 반환되는 안전 폴백이 존재한다.
- 배경 제거가 느릴 경우(p95 > 5s), 텍스트 우선 원칙(RULE-008)을 지키도록 비동기/Lazy 처리가 가능하다.

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/services/image_postprocess.py` - rembg 호출/폴백 로직

**수정**:

- `backend/src/unknown_world/services/image_generation.py` - 이미지 생성 후 rembg 후처리 호출 통합
- `backend/src/unknown_world/models/turn.py` - `image_job` 스키마에 `remove_background` 옵션 추가

**참조**:

- `vibe/ref/rembg-guide.md` - 모델 선택/옵션 가이드(SSOT)
- `vibe/tech-stack.md` - rembg 버전 고정
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008(안전 폴백/텍스트 우선)

## 구현 흐름

### 1단계: 스키마 확장(`remove_background` 옵션)

- `TurnOutput.render.image_job`에 `remove_background: bool = False` 필드를 추가한다.
- 프론트(Zod) 스키마에도 해당 필드를 동기화한다.

### 2단계: rembg 래퍼 서비스 작성

- `image_postprocess.py`에 rembg CLI 또는 라이브러리 호출 래퍼를 작성한다.
- 모델 자동 선택 로직(이미지 유형 힌트 기반)을 포함하거나, 기본값(`u2net`)으로 시작한다.
- 실패 시 원본 이미지를 반환하는 폴백 처리를 포함한다.

### 3단계: 이미지 생성 파이프라인에 통합

- `image_generation.py`에서 이미지 생성 완료 후 `remove_background=True`면 rembg 서비스를 호출한다.
- 결과 이미지 URL/파일 경로를 반환한다.

### 4단계: 비동기/Lazy 처리(선택)

- rembg 처리가 오래 걸릴 경우, 텍스트 우선 응답 후 이미지 URL을 Lazy로 제공하는 옵션을 검토한다.
- MVP에서는 동기 처리로 시작하되, 지연이 문제가 되면 RU에서 비동기화한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-019[Mvp]](U-019[Mvp].md) - 이미지 생성 엔드포인트/잡(이미지 생성 계약)
- **계획서**: [U-020[Mvp]](U-020[Mvp].md) - 프론트 이미지 Lazy Render(placeholder/폴백)
- **결과물**: `image_generation.py`의 이미지 생성 함수

**다음 작업에 전달할 것**:

- U-022(Scanner 슬롯)에서 사용자 업로드 이미지→아이템화 시에도 동일 rembg 파이프라인 재사용 가능
- MMP 이미지 편집(U-103)에서 rembg 후처리 확장 기반

## 주의사항

**기술적 고려사항**:

- (RULE-008) 텍스트 우선: rembg 처리 지연이 턴 응답 TTFB를 블로킹하지 않도록 설계한다.
- (RULE-004) 안전 폴백: rembg 실패 시 원본 이미지를 반환하여 UX 중단을 방지한다.
- rembg는 첫 실행 시 모델 다운로드(100~200MB)가 발생할 수 있음 → 배포/로컬 환경에서 사전 다운로드(`rembg d <model>`) 권장.

**잠재적 리스크**:

- rembg 처리 시간이 예상보다 길어질 경우 → 비동기/Lazy 처리로 전환 가능하도록 래퍼를 설계한다.
- 배경 제거 품질이 이미지 유형에 따라 달라질 수 있음 → 모델 선택 로직을 `vibe/ref/rembg-guide.md` 기준으로 구현한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: MVP에서 rembg 호출은 동기(블로킹)로 할까, 비동기(job/callback)로 할까?
  - Option A: 동기(권장: 단순, 이미지 생성 자체도 동기이므로 일관성)
  - Option B: 비동기(Lazy 이미지 제공, TTFB 최적화 가능하나 복잡도 증가)
  **A1**: Option A

- [x] **Q2**: rembg 모델 선택은 자동(힌트 기반)으로 할까, 고정(`u2net`)으로 시작할까?
  - Option A: 고정(`u2net`) — MVP에서 단순하게 시작
  - Option B: 자동(힌트 기반) — 이미지 유형에 따라 최적 모델 선택
  **A2**: Option B

## 참고 자료

- `vibe/ref/rembg-guide.md` - rembg 모델 선택/옵션 가이드
- `vibe/prd.md` - 6.3 멀티모달 렌더링 파이프라인
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008
