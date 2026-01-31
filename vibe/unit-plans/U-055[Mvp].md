# U-055[Mvp]: 이미지 파이프라인 Mock/Real 모드 통합 검증

## 메타데이터

| 항목      | 내용                  |
| --------- | --------------------- |
| Unit ID   | U-055[Mvp]            |
| Phase     | MVP                   |
| 예상 소요 | 45분                  |
| 의존성    | U-054[Mvp],CP-MVP-05  |
| 우선순위  | High                  |

## 작업 목표

개발 모드(`mock`)에서는 플레이스홀더 이미지가, 실모델 모드(`real`)에서는 실제 Gemini 모델이 생성한 이미지가 **턴 파이프라인을 타고 프론트엔드까지 정상 전달**되는지 전체 루프를 검증한다.

**배경**: U-051~U-054에서 이미지 생성 파이프라인을 구축했다. 이제 Mock 모드와 Real 모드 모두에서 이미지가 정상적으로 생성되고 프론트엔드 SceneCanvas에 표시되는지 확인해야 한다. 이는 CP-MVP-05(멀티모달 이미지 게이트)의 "이미지 파이프라인 통합" 검증을 보완한다.

**완료 기준**:

- `UW_MODE=mock`에서 턴 실행 시 플레이스홀더 이미지 URL이 TurnOutput에 포함되고, 프론트엔드에서 렌더링된다
- `UW_MODE=real`에서 턴 실행 시 Gemini 생성 이미지 URL이 TurnOutput에 포함되고, 프론트엔드에서 렌더링된다
- 이미지 생성 실패 시에도 턴 자체는 성공하고, 텍스트-only로 진행된다
- 런북/시나리오로 재현 가능한 검증 절차가 문서화된다

## 영향받는 파일

**생성**:

- `vibe/unit-runbooks/U-055-image-pipeline-integration-runbook.md` - 통합 검증 런북

**수정**:

- 없음 (검증 유닛이므로 코드 변경 최소화)

**참조**:

- `backend/src/unknown_world/orchestrator/stages/render.py` - 이미지 생성 파이프라인
- `frontend/src/components/SceneCanvas.tsx` - 이미지 렌더링 컴포넌트
- `vibe/unit-runbooks/CP-MVP-05-runbook.md` - 멀티모달 이미지 게이트 런북

## 구현 흐름

### 1단계: Mock 모드 검증

- `UW_MODE=mock` 환경에서 백엔드 시작
- 프론트엔드에서 턴 실행 (이미지 생성이 필요한 시나리오)
- TurnOutput에 `render.image_url`이 포함되는지 확인
- SceneCanvas에 플레이스홀더 이미지가 표시되는지 확인
- 이미지 파일이 `backend/.data/images/generated/`에 생성되는지 확인

### 2단계: Real 모드 검증

- `UW_MODE=real` + Vertex AI 인증 환경에서 백엔드 시작
- 프론트엔드에서 턴 실행
- TurnOutput에 실제 Gemini 생성 이미지 URL이 포함되는지 확인
- SceneCanvas에 생성된 이미지가 표시되는지 확인
- 이미지 생성 시간(TTFB) 측정 및 기록

### 3단계: 폴백 시나리오 검증

- 이미지 생성 비용 부족 시나리오 (Economy 테스트)
- 이미지 생성 실패 시나리오 (API 오류 모킹 또는 잘못된 프롬프트)
- 텍스트-only로 진행되는지 확인

### 4단계: 런북 작성

- 위 시나리오를 재현 가능한 단계별 절차로 문서화
- 예상 결과 및 확인 포인트 명시
- 트러블슈팅 가이드 포함

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-054[Mvp]](U-054[Mvp].md) - 이미지 생성 폴백 체계
- **결과물**: [CP-MVP-05](../unit-results/CP-MVP-05.md) - 멀티모달 이미지 게이트 검증 결과

**다음 작업에 전달할 것**:

- CP-MVP-03: 10분 데모 루프에서 이미지 파이프라인 포함 검증
- MMP: Agentic Vision(U-109) 등 이미지 기반 고급 기능의 기반

## 주의사항

**기술적 고려사항**:

- (RULE-007) 검증 로그에 프롬프트 원문 포함 금지
- Real 모드 검증 시 Vertex AI 인증이 필요하므로, `.env` 설정 확인 필수
- 이미지 생성 지연으로 인해 검증 시간이 길어질 수 있음 (10~15초)

**잠재적 리스크**:

- Vertex AI 할당량 초과로 Real 모드 검증 실패 가능 → Mock 모드 검증 우선, Real은 수동 스팟 테스트로 보완

## 페어링 질문 (결정 필요)

- [x] **Q1**: Real 모드 검증은 필수인가?
  - Option A: Mock + Real 모두 필수 (권장: 완전한 검증)
  - Option B: Mock만 필수, Real은 선택적 (빠른 진행)
  **A1**: Option A (단, Real 검증은 Vertex AI 인증 환경에서만)

## 참고 자료

- `vibe/unit-runbooks/CP-MVP-05-runbook.md` - 멀티모달 이미지 게이트 런북
- `vibe/unit-results/U-020[Mvp].md` - 프론트엔드 이미지 Lazy Render 결과
- `backend/.env.example` - 환경변수 설정 예시
