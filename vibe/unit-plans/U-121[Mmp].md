# U-121[Mmp]: 제출 문서 패키지 (README + 아키텍처 + Write-up)

## 메타데이터

| 항목      | 내용                                              |
| --------- | ------------------------------------------------- |
| Unit ID   | U-121[Mmp]                                        |
| Phase     | MMP                                               |
| 예상 소요 | 45분                                              |
| 의존성    | U-120                                             |
| 우선순위  | ⚡ Critical (제출 필수: 문서/설명)                |

## 작업 목표

Devpost 제출에 필요한 **영문 문서 패키지**를 작성한다: (1) 영문 `README.md`(프로젝트 소개, 기술 스택, 실행 방법, 데모 링크), (2) **아키텍처 다이어그램**(심사 가점), (3) **Gemini Integration 텍스트**(~200 words, 제출 필수 항목).

**배경**: Devpost 심사 기준 Presentation/Demo(10%)에서 _"Is the problem clearly defined, and is the solution effectively presented through a demo and documentation? Have they explained how they used Gemini 3 and any relevant tools? Have they included documentation or an architectural diagram?"_ 를 평가한다. 또한 제출 시 _"brief text write-up (~200 words) that describes the Gemini Integration"_ 이 필수 필드이다. Technical Execution(40%)에서도 코드 품질과 함께 문서화가 간접 평가되므로, 영문 README와 아키텍처 다이어그램을 포함하면 두 기준에서 동시에 점수를 확보할 수 있다.

**완료 기준**:

- 영문 `README.md`가 프로젝트 루트에 존재하며, 프로젝트 개요·핵심 기능·기술 스택·실행 방법·데모 링크를 포함
- 아키텍처 다이어그램이 생성되어 README에 포함됨 (Mermaid 또는 이미지)
- Gemini Integration 설명문(~200 words, 영문)이 `docs/gemini-integration.md`에 작성됨
- **모든 문서가 영문**으로 작성됨 (Devpost 요건: "All Submission materials must be in English")
- API 키/Secret/프롬프트 원문이 문서에 포함되지 않음

## 영향받는 파일

**생성/수정**:

- `README.md` - 영문 프로젝트 소개 (기존 있으면 전면 재작성, 없으면 생성)
- `docs/architecture.md` - 아키텍처 다이어그램 (Mermaid 기반)
- `docs/gemini-integration.md` - Gemini Integration 텍스트 (~200 words)

**참조**:

- `vibe/prd.md` - 제품 설명 소스
- `vibe/tech-stack.md` - 기술 스택 소스
- U-120의 공개 데모 URL
- Devpost 제출 요건 페이지

## 구현 흐름

### 1단계: README.md 작성 (영문)

- **Project Overview**: Unknown World란? (에이전트형 Game Master + 무한 생성 로그라이크)
- **Key Features**: 핵심 기능 하이라이트 5-6개
  - Agent-driven Game Master with Structured Outputs
  - Real-time Streaming with Agent Console (Plan/Queue/Badges)
  - Multimodal Scene Generation (text + image)
  - Interactive Game UI (Action Deck, Inventory DnD, Hotspots)
  - Economy System (Signal/Shard, cost prediction, ledger)
  - Scanner: Upload real-world images → in-game items
- **Tech Stack**: React 19 + Vite 7 / FastAPI + Python 3.14 / Gemini 3 API
- **Quick Start**: `docker compose up` + localhost URL
- **Live Demo**: 공개 데모 URL (U-120 결과)
- **Architecture**: 다이어그램 링크/임베드
- **Gemini 3 Integration**: 핵심 활용 포인트 요약
- **Screenshots**: (선택) 핵심 화면 스크린샷 2-3장

### 2단계: 아키텍처 다이어그램 생성

- **Mermaid 기반** 시스템 아키텍처 작성 (코드 기반, 수정 용이):
  - User Input → React Frontend → HTTP Streaming → FastAPI Orchestrator
  - Orchestrator Pipeline: Parse → Validate → Plan → Resolve → Render → Verify → Commit
  - Gemini API 연동: Text(Flash/Pro) + Image(Pro Image) + Vision(Flash)
  - State Management: Zustand (WorldState/Inventory/Economy) + Zod Validation
- (선택) nanobanana mcp로 시각적 다이어그램 이미지도 생성

### 3단계: Gemini Integration Write-up (~200 words, 영문)

- **어떤 Gemini 3 기능을 사용했는지**: Structured Outputs, Image Generation, Vision/Understanding, Streaming
- **어떻게 핵심에 통합되었는지**:
  - Game Master가 JSON Schema 강제 출력으로 UI/상태/비용을 구조화
  - 장면 이미지 생성/편집 (gemini-3-pro-image-preview)
  - Scanner 이미지 이해 (캡션/오브젝트 감지/아이템화)
  - 실시간 스트리밍으로 타자 효과 + Agent Console 단계 표시
- **차별점**: "프롬프트 래퍼"가 아닌 상태 기반 게임 시스템, 이중 검증(Pydantic+Zod) + Repair loop

### 4단계: 검증

- 모든 문서가 **영문**인지 최종 확인
- README의 실행 방법(`docker compose up`)이 실제로 동작하는지 확인
- 데모 링크가 유효한지 확인
- API 키/Secret/프롬프트 원문이 문서에 노출되지 않는지 확인
- Gemini Integration 텍스트가 ~200 words인지 word count 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **U-120[Mmp]**: 공개 데모 URL (README/Write-up에 포함)
- **vibe/prd.md**: 제품 설명 소스 (한국어 → 영문 번역 기반)
- **vibe/tech-stack.md**: 기술 스택 정보

**다음 작업에 전달할 것**:

- **U-122[Mmp]**: 데모 영상의 시나리오/스크립트 참조 (Write-up 기반)
- **CP-SUB-01**: 제출 체크포인트의 "문서 완비" 항목

## 주의사항

**기술적 고려사항**:

- (Devpost) 모든 제출 자료는 **영문 필수**: "All Submission materials must be in English"
- (Devpost) 아키텍처 다이어그램은 심사 가점: "Have they included documentation or an architectural diagram?"
- (RULE-007) README에 API 키/Secret 노출 금지 → `.env.example` 참조로 대체
- (RULE-008) 프롬프트 원문/내부 추론을 문서에 포함하지 않음
- Write-up은 ~200 words로 **간결하게** (Devpost 권장 분량)

**잠재적 리스크**:

- 시간 부족 시 아키텍처 다이어그램 품질 저하 → Mermaid 텍스트 기반으로 최소 보장
- README가 너무 길면 심사자 이탈 → **핵심만 간결하게**, 상세는 docs/로 분리
- 한국어-영어 번역 시 기술 용어 불일치 → PRD의 영문 용어(Structured Outputs, Repair loop 등) 그대로 사용

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 아키텍처 다이어그램 형식
  - Option A: Mermaid (코드 기반, 수정 용이, GitHub 자동 렌더링) → **권장**
  - Option B: nanobanana mcp 이미지 (시각적 품질↑, 수정 어려움)
  - Option C: 둘 다 (Mermaid + 이미지 렌더링)

- [ ] **Q2**: README에 스크린샷을 포함할까?
  - Option A: 포함 (시각적 임팩트↑, 파일 크기↑) → 권장 (심사자에게 첫인상 제공)
  - Option B: 미포함 (텍스트만, 데모 링크로 유도)

## 참고 자료

- `vibe/prd.md` - 제품 설명 소스
- `vibe/tech-stack.md` - 기술 스택 소스
- Devpost 제출 요건: "brief text write-up (~200 words)", "documentation or an architectural diagram"
- Devpost 심사 기준: Presentation/Demo(10%), Technical Execution(40%)
