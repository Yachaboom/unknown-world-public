# U-122[Mmp]: 데모 영상 제작 (3분, 영어 자막)

## 메타데이터

| 항목      | 내용                                              |
| --------- | ------------------------------------------------- |
| Unit ID   | U-122[Mmp]                                        |
| Phase     | MMP                                               |
| 예상 소요 | 60분                                              |
| 의존성    | U-119, U-120                                      |
| 우선순위  | ⚡ Critical (제출 필수: 데모 영상)                |

## 작업 목표

Devpost 제출 필수 항목인 **3분 이내 데모 영상**을 제작한다. 배포된 환경(U-120)에서 다듬어진 UI(U-119)로 핵심 기능을 시연하고, **영어 자막 또는 영어 내레이션**을 포함한다. YouTube(권장) 또는 Vimeo에 공개 업로드한다.

**배경**: Devpost 요건: _"Include a demonstration video. Should include footage that shows the Project functioning on the platform(s) for which it was built. Not longer than 3 minutes (only first 3 minutes evaluated). Must be in English or include English subtitles. Uploaded to YouTube (recommended) or Vimeo."_ 심사 기준 Presentation/Demo(10%)에 직접 영향하며, Technical Execution(40%)과 Innovation/Wow Factor(30%)도 **영상을 통해 증명**되므로 실질적으로 전체 점수의 핵심 전달 매체이다.

**완료 기준**:

- **3분 이내**의 데모 영상이 제작됨 (초과 시 첫 3분만 평가됨)
- **영어 자막** 또는 **영어 내레이션**이 포함됨
- **YouTube**(권장) 또는 Vimeo에 공개(또는 Unlisted) 업로드됨
- 핵심 기능이 시연됨:
  - 프로필 선택 → 텍스트 스트리밍(타자 효과)
  - Action Deck → Scene Canvas(이미지 생성)
  - Inventory DnD → Economy HUD(비용/잔액)
  - Agent Console(단계/배지)
  - (선택) Scanner 이미지 업로드 → 아이템화
- Gemini 3 활용 포인트가 자막/내레이션으로 명시적으로 강조됨
- 영상에 API 키/프롬프트 원문이 노출되지 않음

## 영향받는 파일

**생성**:

- `docs/demo-script.md` - 데모 영상 시나리오/스크립트 (영문)
- (외부) YouTube/Vimeo 업로드 URL

**참조**:

- U-119: 다듬어진 UI 상태
- U-120: 배포된 데모 URL
- U-121: Gemini Integration 설명 (영상 스크립트 참조)
- `vibe/prd.md` §7 - 사용자 여정 (시나리오 참조)

## 구현 흐름

### 1단계: 데모 시나리오/스크립트 작성 (영문)

- **3분 분량** 시나리오를 영문으로 작성:
  - **[0:00-0:30] Introduction** (30초):
    - "Unknown World is an infinite generative roguelike narrative web game..."
    - 프로필 선택 화면 → 즉시 게임 시작 (no login required)
  - **[0:30-2:00] Core Gameplay** (90초):
    - 텍스트 스트리밍(타자 효과) 시연
    - Action Deck에서 카드 선택 (비용/위험 표시)
    - Scene Canvas에서 이미지 생성 과정 (로딩 → 렌더)
    - Inventory에서 아이템 드래그 → 핫스팟에 드롭 (조합/사용)
    - Economy HUD: Signal/Shard 잔액 변화
    - (선택) Scanner: 이미지 업로드 → 아이템 생성
  - **[2:00-2:45] Technical Highlights** (45초):
    - Agent Console: 실시간 파이프라인 단계 표시 (Parse→Validate→Plan→...)
    - Validation badges: Schema OK, Economy OK, Safety OK
    - "Powered by Gemini 3: Structured Outputs + Image Generation + Vision"
    - Repair loop 시연 (선택: 의도적 실패 → 자동 복구)
  - **[2:45-3:00] Closing** (15초):
    - "Not a chat wrapper — a stateful game system"
    - 데모 링크 + GitHub 링크 표시

### 2단계: 화면 녹화

- **배포된 환경**(U-120)에서 시나리오를 따라 플레이 녹화
- **해상도**: 1920x1080 권장 (YouTube HD)
- **네트워크**: 지연이 적은 환경에서 녹화 (배포 리전과 가까운 곳)
- **브라우저**: Chrome, DevTools 닫힌 상태
- 여러 테이크를 촬영하여 **최적의 LLM 응답**이 나온 테이크 선택
- Agent Console이 잘 보이도록 사이드 패널 펼친 상태에서 녹화

### 3단계: 편집 + 자막/내레이션

- 불필요한 대기 시간 **컷/속도 조절** (특히 이미지 생성 대기)
- **영어 자막** 추가:
  - 주요 기능 설명 (화면 하단 또는 사이드)
  - Gemini 활용 포인트 강조 텍스트
  - 기술 용어는 정확하게, 게임 내러티브는 자연스러운 영어
- (선택) **영어 TTS 내레이션** (시간 여유 시)
- 최종 길이: **2분 30초~3분** 목표

### 4단계: 업로드 + 제출 연결

- YouTube에 **Public 또는 Unlisted** 업로드
- 영상 제목: "Unknown World - Gemini 3 Hackathon Demo"
- 영상 설명에 프로젝트 링크 + GitHub 링크 포함
- Devpost 제출 폼에 YouTube URL 입력
- 영상이 재생 가능한지 **시크릿/익스플로잇 브라우저**에서 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **U-119[Mmp]**: 다듬어진 프론트엔드 UI (영상의 시각적 품질)
- **U-120[Mmp]**: 배포된 공개 데모 환경 (영상 녹화 대상)
- **U-121[Mmp]**: Gemini Integration 설명 (영상 스크립트의 기술 하이라이트 참조)

**다음 작업에 전달할 것**:

- **CP-SUB-01**: 제출 체크포인트의 "데모 영상" 항목
- Devpost 제출 폼의 Video URL 필드

## 주의사항

**기술적 고려사항**:

- (Devpost) 영상은 **3분 이내** 필수. 초과 시 **첫 3분만 평가**됨 → 핵심을 앞에 배치
- (Devpost) **영어** 또는 **영어 자막** 필수
- (Devpost) 부적절한 콘텐츠/제3자 광고 금지
- (RULE-007/008) 영상에 API 키/Secret/프롬프트 원문이 **절대 노출되지 않도록** 주의
  - Agent Console의 "프롬프트 원문" 표시가 없는지 확인 (메타/라벨만 표시)
  - 브라우저 주소창에 API 키 파라미터가 노출되지 않는지 확인
- 게임 내 내러티브가 부적절한 내용을 생성하지 않도록 **안전한 시나리오** 선택

**잠재적 리스크**:

- LLM 비결정성으로 녹화 중 예상치 못한 출력(비속어, 스키마 오류 등) → **여러 테이크** 촬영 후 최적 선택
- 이미지 생성 지연으로 영상 흐름 끊김 → 텍스트 우선 출력 장면을 강조하거나, **편집으로 대기 시간 단축**
- YouTube 업로드 후 처리 시간(HD 인코딩) → 제출 마감 최소 2시간 전 업로드 권장
- 영어 자막 품질 → 기술 용어는 Gemini/Structured Outputs 등 공식 명칭 사용

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 영상 언어 방식
  - Option A: 영어 내레이션 (TTS 또는 직접 녹음) → 품질↑, 시간↑
  - Option B: 영어 자막만 (화면 녹화 + 자막 오버레이) → **권장 (시간 효율)**

- [ ] **Q2**: 녹화 환경
  - Option A: 배포된 공개 URL에서 녹화 (실제 환경 증명) → **권장**
  - Option B: 로컬에서 녹화 (안정적, 지연↓)

## 참고 자료

- Devpost 제출 요건: "demonstration video", "not longer than 3 minutes", "English or English subtitles", "YouTube (recommended) or Vimeo"
- `vibe/prd.md` §7 - 사용자 여정 (데모 시나리오 참조)
- `vibe/prd.md` §6.8 - 에이전트 동작 가시화 (기술 하이라이트 참조)
- Devpost 심사 기준: Presentation/Demo(10%), Technical Execution(40%), Innovation/Wow Factor(30%)
