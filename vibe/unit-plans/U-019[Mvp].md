# U-019[Mvp]: 이미지 생성 엔드포인트/잡(조건부)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-019[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-016,U-017 |
| 우선순위  | ⚡ Critical |

## 작업 목표

장면 이미지를 “선택적으로” 생성할 수 있도록, 백엔드에 **이미지 생성 엔드포인트/잡**을 추가하고 `gemini-3-pro-image-preview` 모델로 고정한다.

**배경**: PRD는 텍스트 우선 + Lazy 이미지 생성/편집을 요구하며, 이미지 모델 ID는 고정이다. (RULE-010, PRD 6.3/8.5)

**완료 기준**:

- 이미지 생성 요청이 별도 경로(엔드포인트/잡)로 수행되어, 텍스트 턴의 TTFB를 블로킹하지 않는다. (RULE-008)
- 이미지 모델 ID는 `gemini-3-pro-image-preview`로 고정되고 혼용되지 않는다. (RULE-010)
- 실패 시에도 텍스트-only로 진행 가능하도록 안전한 오류/폴백 응답이 존재한다. (RULE-004)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/api/image.py` - 이미지 생성 요청 엔드포인트
- `backend/src/unknown_world/services/image_generation.py` - 이미지 생성 호출/저장 로직

**수정**:

- `backend/src/unknown_world/main.py` - 라우터 등록(필요 시)

**참조**:

- `vibe/tech-stack.md` - 이미지 모델 ID 고정
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008/010
- `.cursor/rules/20-backend-orchestrator.mdc` - 텍스트 우선 + Lazy 이미지 원칙

## 구현 흐름

### 1단계: 이미지 생성 요청 계약 정의

- 입력: `prompt`, `aspect_ratio`, `image_size`, (선택) `reference_images`
- 출력: `image_url`(또는 job_id), `status`, 실패 시 `message`
- TurnOutput의 `render.image_job`과 정합되도록 필드/용어를 맞춘다.

### 2단계: 이미지 생성 호출(모델 고정) + 저장

- 호출은 `gemini-3-pro-image-preview`로만 수행한다.
- 저장은 MVP에서는 로컬 저장/서빙(또는 메모리)로 시작하고, GCS는 MMP(U-102)에서 확장한다.

### 3단계: 실패/안전/비용 고려

- 이미지 생성 실패 시: 텍스트-only 진행 가능하도록 `should_generate=false` 폴백을 지원한다.
- (가능하면) 잔액 부족/정책상 불가 시 “대체 행동”을 반환한다(저해상도/생략). (RULE-005)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-016[Mvp]](U-016[Mvp].md) - GenAI 클라이언트/모델 라벨 고정
- **계획서**: [U-017[Mvp]](U-017[Mvp].md) - TurnOutput 생성(이미지 job 필드 정합)

**다음 작업에 전달할 것**:

- U-020에서 프론트 SceneCanvas가 이미지 URL을 받아 Lazy 렌더할 수 있는 백엔드 기능
- U-035에서 rembg 배경 제거 통합을 위한 이미지 생성 파이프라인 기반
- U-036에서 이미지 프롬프트 파일 로딩을 위한 연동 기반
- RU-006에서 정리할 media/artifacts 스토리지 기반

## 주의사항

**기술적 고려사항**:

- (RULE-008) 텍스트 우선: 이미지 생성은 턴 응답을 블로킹하지 않는 구조를 우선한다.
- (RULE-007) 비밀정보/프롬프트 원문 노출 금지: 로그에는 메타(라벨/버전)만.

**잠재적 리스크**:

- 이미지 저장/서빙이 MVP에서 복잡해질 수 있음 → 우선 로컬 단순 구현 후 RU-006/MMP에서 추상화/확장한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: MVP 이미지 응답은 어떤 방식이 좋을까?
  - Option A: 로컬 파일로 저장 후 `image_url`로 서빙(권장: 브라우저 친화)
  - Option B: base64를 바로 반환(구현 단순하지만 페이로드/메모리 부담)

## 참고 자료

- `vibe/tech-stack.md` - 이미지 모델 ID 고정
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008/010
