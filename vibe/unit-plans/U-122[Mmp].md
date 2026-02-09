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
- **영어 자막**이 YouTube CC로 등록됨 (번인 아닌 별도 SRT 파일 업로드, CC on/off 가능)
- **YouTube**(권장) 또는 Vimeo에 공개(또는 Unlisted) 업로드됨
- **5개 핵심 시나리오**가 모두 시연됨:
  1. 자유 텍스트 입력 → 텍스트 스트리밍(타자 효과) + Scene 이미지 생성
  2. 사진 업로드(Scanner, `vibe/ref/sample/test.png`) → **Gemini Vision** 분석 → 아이템 획득
  3. "정밀조사(Investigate)" → **Gemini Agent Vision** → 핫스팟 생성 → 핫스팟 클릭 → 턴 진행
  4. "정밀조사" → 핫스팟 생성 → 인벤토리 아이템 드래그&드롭 → 핫스팟 상호작용 → 턴 진행
  5. 엔딩 세션 보고서 (여정 요약 / 타임라인 / 경제 결산)
- Agent Console(단계/배지) + Economy HUD(비용/잔액)이 시연 전반에 걸쳐 노출됨
- Gemini 활용 포인트가 자막으로 명시적으로 강조됨 (최소 안내 자막 10~15개)
- 영상에 API 키/프롬프트 원문이 노출되지 않음

## 영향받는 파일

**생성**:

- `e2e/demo-recording.spec.ts` - Playwright 데모 시나리오 자동화 + 비디오 녹화 스크립트
- `e2e/playwright.demo.config.ts` - 데모 녹화 전용 Playwright 설정 (해상도/비디오/타임아웃)
- `e2e/scripts/post-process.sh` - ffmpeg 기반 배속 조절 스크립트 (자막 번인 없음)
- `e2e/subtitles/demo-en.srt` - YouTube CC 업로드용 영어 자막 파일 (SRT 형식, 최종 배속 기준 타임코드)
- `docs/demo-script.md` - 데모 영상 시나리오/스크립트 (영문)
- (외부) YouTube/Vimeo 업로드 URL

**참조**:

- U-119: 다듬어진 UI 상태
- U-120: 배포된 데모 URL
- U-121: Gemini Integration 설명 (영상 스크립트 참조)
- `vibe/prd.md` §7 - 사용자 여정 (시나리오 참조)
- `vibe/ref/sample/test.png` - Scenario 2(사진 업로드) 테스트용 샘플 이미지

## 구현 흐름

### 1단계: 데모 시나리오/스크립트 작성 (영문)

- **3분 분량** 시나리오를 **5개 핵심 시나리오** 중심으로 영문 작성 (**FHD 1920x1080** 촬영):
  - **[0:00-0:20] Introduction** (20초):
    - "Unknown World is an infinite generative roguelike narrative web game powered by Gemini"
    - 프로필 선택 화면 → 즉시 게임 시작 (no login required)
  - **[0:20-0:50] Scenario 1: 자유 텍스트 입력** (30초):
    - 텍스트 입력란에 직접 입력 (예: "I look around carefully")
    - 턴 실행 → 스트리밍 텍스트(타자 효과) 시연
    - Scene Canvas 이미지 생성 과정 (로딩 → 렌더)
    - Agent Console 파이프라인 간략 노출
  - **[0:50-1:15] Scenario 2: 사진 업로드 → 아이템 획득** (25초):
    - Scanner 영역에 이미지 드래그/업로드 (`vibe/ref/sample/test.png` 사용)
    - **Gemini Vision** 분석 → 캡션 생성 → 아이템화 결과
    - 인벤토리에 새 아이템 추가 확인
    - Economy HUD: Signal/Shard 잔액 변화
  - **[1:15-1:45] Scenario 3: 정밀조사 → 핫스팟 클릭** (30초):
    - Action Deck에서 "Investigate(정밀조사)" 카드 선택
    - **Gemini Agent Vision**이 Scene Canvas를 분석 → 핫스팟(인터랙티브 포인트) 생성
    - Scene Canvas에 핫스팟 표시 → 핫스팟 클릭 → 턴 진행
    - 자막: "Gemini Agent Vision: AI analyzes the scene and creates interactive hotspots"
  - **[1:45-2:15] Scenario 4: 정밀조사 → 아이템 드래그&드롭** (30초):
    - Action Deck에서 "Investigate" 다시 선택 → 새 핫스팟 생성
    - 인벤토리 아이템 드래그 → 핫스팟에 드롭 (아이템+환경 상호작용)
    - 상호작용 결과 텍스트 + Economy HUD 잔액 변화
  - **[2:15-2:35] Technical Highlights** (20초):
    - Agent Console: 실시간 파이프라인 단계 표시 (Parse→Validate→Plan→Execute→Verify)
    - Validation badges: Schema OK, Economy OK, Safety OK
    - "Powered by Gemini: Structured Outputs + Image Generation + Vision"
  - **[2:35-2:52] Scenario 5: 엔딩 세션 보고서** (17초):
    - 엔딩 트리거 (데모용 시나리오 단축)
    - **세션 보고서 화면**: 여정 요약 / 타임라인 / 경제 결산 표시
    - 리플레이 가능 확인
  - **[2:52-3:00] Closing** (8초):
    - "Not a chat wrapper — a stateful game system"
    - 데모 링크 + GitHub 링크 표시

#### 자막 설계 원칙 (YouTube CC 전용)

자막은 **영상에 번인(burn-in)하지 않고**, YouTube 자막(CC) 파일로 별도 업로드한다. 시청자가 CC 버튼으로 on/off 가능하며, Devpost 심사 요건("English subtitles")을 충족한다.

- **최소화 원칙**: 화면에서 이미 보이는 내용(게임 텍스트, UI 라벨)은 자막으로 반복하지 않음
- **안내 자막만**: 현재 무엇을 시연하는지 **짧은 한 줄 안내** 수준
- **자막 수**: 전체 10~15개 이내 (3분 기준 평균 12~18초 간격)
- **문체**: 간결한 현재형 영어, 기술 용어는 공식 명칭 사용

**자막 예시** (`e2e/subtitles/demo-en.srt`):

```srt
1
00:00:01,000 --> 00:00:05,000
Unknown World — An infinite generative roguelike powered by Gemini

2
00:00:06,000 --> 00:00:09,000
Select a character profile to begin. No login required.

3
00:00:21,000 --> 00:00:25,000
Scenario 1: Free-text input drives the narrative forward.

4
00:00:36,000 --> 00:00:40,000
The narrative streams in real-time via structured JSON output.

5
00:00:51,000 --> 00:00:56,000
Scenario 2: Upload a photo — Gemini Vision turns it into an in-game item.

6
00:01:05,000 --> 00:01:09,000
The scanned object is now in your inventory.

7
00:01:16,000 --> 00:01:21,000
Scenario 3: "Investigate" — Gemini Agent Vision analyzes the scene.

8
00:01:30,000 --> 00:01:35,000
AI-generated hotspots appear. Click one to interact.

9
00:01:46,000 --> 00:01:51,000
Scenario 4: Drag an inventory item onto a hotspot to combine.

10
00:02:02,000 --> 00:02:07,000
Item-environment interaction powered by structured outputs.

11
00:02:16,000 --> 00:02:21,000
Agent Console shows the live orchestration pipeline.

12
00:02:25,000 --> 00:02:30,000
Powered by Gemini: Structured Outputs + Image Generation + Vision.

13
00:02:36,000 --> 00:02:41,000
Scenario 5: Session report — journey summary, timeline, economy ledger.

14
00:02:52,000 --> 00:02:59,000
Not a chat wrapper — a stateful game system. Try it live ▸ [demo link]
```

- 타임코드는 **ffmpeg 배속 처리 후 최종 영상 기준**으로 작성 (원본 기준 X)
- 배속 계수 확정 후 타임코드 한 번 조정 필요 → `post-process.sh`에서 자동 안내 출력

### 2단계: Playwright 자동화 환경 구성

- **Playwright 설치 및 데모 전용 config** 작성 (`e2e/playwright.demo.config.ts`):
  ```ts
  // 핵심 설정
  use: {
    baseURL: process.env.DEMO_URL || 'http://localhost:8001',
    viewport: { width: 1920, height: 1080 },  // FHD 고정 해상도
    video: { mode: 'on', size: { width: 1920, height: 1080 } },  // FHD 녹화
    launchOptions: { slowMo: 300 },  // 시각적 가독성용 의도적 딜레이
  },
  timeout: 180_000,  // LLM 응답 대기 포함 3분
  outputDir: './e2e/recordings/',
  ```
- **의존성**: `pnpm add -D @playwright/test` + `npx playwright install chromium`
- **환경 변수**: `DEMO_URL` (배포 URL 또는 로컬), `DEMO_PROFILE` (프로필 선택 인덱스)

### 3단계: Playwright 시나리오 스크립트 작성 (5개 시나리오 기반)

`e2e/demo-recording.spec.ts` 구현 — **FHD(1920x1080)** 해상도에서 5개 시나리오를 순차 실행:

- **[Intro] 프로필 선택 → 게임 진입**:
  - `page.click('[data-testid="profile-card-0"]')` (또는 적절한 셀렉터)
  - `page.waitForSelector('[data-testid="scene-canvas"]')` → 게임 로드 확인
  - `page.waitForTimeout(2000)` — 첫인상 체류
- **[Scenario 1] 자유 텍스트 입력**:
  - 텍스트 입력란에 직접 타이핑: `page.fill('[data-testid="text-input"]', 'I look around carefully')`
  - 전송: `page.click('[data-testid="submit-btn"]')` 또는 `page.press('Enter')`
  - 텍스트 스트리밍 완료 대기: `page.waitForSelector('[data-testid="typing-complete"]', { timeout: 60_000 })`
  - Scene Canvas 이미지 로딩 대기: `page.waitForSelector('img[data-testid="scene-image"]')`
  - `page.waitForTimeout(3000)` — 이미지 감상 체류
- **[Scenario 2] 사진 업로드 → 아이템 획득** (`vibe/ref/sample/test.png` 사용):
  - Scanner 영역에 파일 업로드: `page.setInputFiles('[data-testid="scanner-input"]', 'vibe/ref/sample/test.png')`
  - Gemini Vision 분석 완료 대기: `page.waitForSelector('[data-testid="scanner-result"]', { timeout: 60_000 })`
  - 인벤토리 아이템 추가 확인: `page.waitForSelector('[data-testid="inventory-item-new"]')`
  - `page.waitForTimeout(2000)` — 아이템 획득 확인 체류
- **[Scenario 3] 정밀조사 → 핫스팟 클릭** (Gemini Agent Vision 강조):
  - "Investigate" Action 카드 클릭: `page.click('[data-testid="action-card-investigate"]')`
  - 핫스팟 생성 대기: `page.waitForSelector('[data-testid="hotspot-0"]', { timeout: 60_000 })`
  - `page.waitForTimeout(2000)` — Agent Vision 핫스팟 생성 과정 감상
  - 핫스팟 클릭: `page.click('[data-testid="hotspot-0"]')`
  - 턴 결과 대기: `page.waitForSelector('[data-testid="typing-complete"]', { timeout: 60_000 })`
  - `page.waitForTimeout(3000)` — 결과 감상
- **[Scenario 4] 정밀조사 → 아이템 DnD**:
  - "Investigate" 재선택: `page.click('[data-testid="action-card-investigate"]')`
  - 새 핫스팟 생성 대기: `page.waitForSelector('[data-testid="hotspot-0"]', { timeout: 60_000 })`
  - 인벤토리 아이템 드래그 → 핫스팟 드롭: `page.dragAndDrop('[data-testid="inventory-item-0"]', '[data-testid="hotspot-0"]')`
  - 상호작용 결과 대기: `page.waitForSelector('[data-testid="typing-complete"]', { timeout: 60_000 })`
  - Economy HUD 잔액 변화 대기: `page.waitForFunction(() => ...)`
  - `page.waitForTimeout(3000)` — 결과 감상
- **[Tech] Technical Highlights**:
  - Agent Console 단계/배지가 표시되는 구간에서 `page.waitForTimeout(3000)` (시각적 체류)
  - 각 검증 배지(Schema OK, Economy OK, Safety OK)가 나타날 때까지 대기
- **[Scenario 5] 엔딩 세션 보고서**:
  - 엔딩 트리거 (데모용 액션 또는 턴 수 도달): 사전 시나리오 설계에 따라 진행
  - 세션 보고서 화면 대기: `page.waitForSelector('[data-testid="ending-report"]', { timeout: 60_000 })`
  - `page.waitForTimeout(5000)` — 보고서 내용 감상 (여정 요약/타임라인/경제 결산)
- **[Closing]**: 최종 화면에서 `page.waitForTimeout(3000)` 체류
- **중요한 장면에서 의도적 대기** 삽입 (`waitForTimeout`):
  - 프로필 선택 직후: 2초 (첫인상)
  - 각 턴 텍스트 스트리밍 중: 자연스러운 읽기 시간
  - 이미지 렌더 완료 후: 3초 (시각적 감상)
  - 핫스팟 생성 후: 2초 (Agent Vision 하이라이트)
  - Agent Console 배지 표시 후: 2초 (기술 하이라이트)
  - 엔딩 보고서: 5초 (세션 결산 감상)
- **재시도 전략**: LLM 비결정성 대비 `test.describe.configure({ retries: 3 })` 설정. 최적의 테이크를 `recordings/` 폴더에서 수동 선별

### 4단계: 녹화 실행 (멀티 테이크)

```bash
# 배포 환경 대상 녹화 (권장)
DEMO_URL=https://unknown-world.example.com \
  npx playwright test e2e/demo-recording.spec.ts \
  --config=e2e/playwright.demo.config.ts \
  --repeat-each=3  # 3회 테이크

# 로컬 환경 대상 녹화 (대안)
npx playwright test e2e/demo-recording.spec.ts \
  --config=e2e/playwright.demo.config.ts
```

- 결과물: `e2e/recordings/` 에 `.webm` 파일 생성
- 3회 이상 테이크 촬영 → **최적의 LLM 응답이 나온 테이크 수동 선별**
- Agent Console이 잘 보이도록 사이드 패널 펼친 상태에서 녹화

### 5단계: ffmpeg 후처리 (배속 조절)

`e2e/scripts/post-process.sh` 구현 — **자막은 번인하지 않음** (YouTube CC로 별도 업로드):

```bash
#!/bin/bash
INPUT="${1:-e2e/recordings/best-take.webm}"
OUTPUT="${2:-demo-final.mp4}"
TARGET_DURATION=180  # 3분 = 180초

# 1) 원본 길이 측정 → 배속 계수 자동 계산
DURATION=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 "$INPUT")
SPEED=$(echo "$DURATION / $TARGET_DURATION" | bc -l)
PTS=$(echo "1 / $SPEED" | bc -l)

# 2) 배속 조절 + H.264 인코딩 (자막 번인 없음)
ffmpeg -i "$INPUT" \
  -filter:v "setpts=${PTS}*PTS" \
  -an \
  -c:v libx264 -preset medium -crf 18 \
  "$OUTPUT"

echo "✅ Output: $OUTPUT (target: ${TARGET_DURATION}s, speed: ${SPEED}x)"
echo "📝 자막 파일(demo-en.srt)은 YouTube Studio에서 별도 업로드하세요."
echo "   타임코드가 최종 영상(${TARGET_DURATION}s) 기준인지 확인하세요."
```

- **구간별 가변 배속** (고급, 선택): ffmpeg `select` + `setpts` 필터 조합으로 "중요 장면 1x, 대기 구간 5x" 가능
- **자막은 별도 파일로 관리**: `e2e/subtitles/demo-en.srt` → YouTube Studio CC 업로드 전용
- 최종 길이: **2분 30초~3분** 목표

### 6단계: 업로드 + 자막 등록 + 제출 연결

- YouTube에 **Public 또는 Unlisted** 업로드 (`demo-final.mp4` — 자막 미포함 클린 영상)
- **YouTube Studio → 자막 추가**:
  1. 영상 편집 → "자막" 탭 → "파일 업로드" → "타이밍 포함" 선택
  2. `e2e/subtitles/demo-en.srt` 업로드
  3. 미리보기에서 타임코드 정합 확인 → 어긋나면 SRT 타임코드 수동 조정 후 재업로드
  4. "게시" → CC 버튼 활성화 확인
- 영상 제목: "Unknown World - Gemini 3 Hackathon Demo"
- 영상 설명에 프로젝트 링크 + GitHub 링크 포함
- Devpost 제출 폼에 YouTube URL 입력
- **검증 체크리스트**:
  - [ ] 시크릿/프라이빗 브라우저에서 영상 재생 가능
  - [ ] CC 버튼 클릭 → 영어 자막이 정상 표시
  - [ ] 자막이 시나리오 구간에 맞게 시간 동기화
  - [ ] 자막 off 시 영상이 깨끗 (번인 없음)

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

**Playwright 관련 고려사항**:

- **셀렉터 안정성**: `data-testid` 속성 기반 셀렉터를 우선 사용. 미존재 시 CSS 클래스/텍스트 기반 대안 활용
- **LLM 응답 대기**: 고정 `waitForTimeout` 대신 `waitForSelector`/`waitForFunction`으로 동적 대기. 단, 시각적 체류 목적의 의도적 대기는 `waitForTimeout` 사용
- **slowMo 조정**: 배속 후처리와 조합 시 너무 느리면 원본이 과도하게 길어짐 → `slowMo: 200~400ms` 범위에서 튜닝
- **비디오 코덱**: Playwright 기본 출력은 VP8 `.webm`. ffmpeg 후처리에서 H.264 `.mp4`로 변환 (자막 번인 없이 클린 영상)
- **해상도**: **FHD(`1920x1080`)** 고정. Playwright `viewport`와 `video.size` 모두 일치시킬 것. 최종 영상도 FHD 품질 유지 (ffmpeg 인코딩 시 해상도 축소 금지)
- **실패 복구**: `retries: 3` 설정으로 LLM 비결정성 대비. `recordings/` 내 모든 테이크 보존 → 최적 선별

**잠재적 리스크**:

- LLM 비결정성으로 녹화 중 예상치 못한 출력(비속어, 스키마 오류 등) → Playwright `retries` + **여러 테이크** 촬영 후 최적 선택
- 이미지 생성 지연으로 원본 영상이 과도하게 길어짐 → ffmpeg 배속 자동 계산으로 3분 맞춤 + **구간별 가변 배속**(선택) 으로 대기 구간 고속 처리
- Playwright 셀렉터 변경 시 스크립트 깨짐 → `data-testid` 기반 + 핵심 셀렉터 상수화
- YouTube 업로드 후 처리 시간(HD 인코딩) → 제출 마감 최소 2시간 전 업로드 권장
- 영어 자막 품질 → 기술 용어는 Gemini/Structured Outputs 등 공식 명칭 사용
- YouTube CC 업로드 후 처리까지 수 분 소요 가능 → CC 활성화 확인 후 Devpost 제출
- SRT 타임코드가 배속 후 최종 영상 기준이 아닐 경우 자막 싱크 어긋남 → 배속 확정 후 타임코드 최종 검수

## 페어링 질문 (결정 필요)

- [x] **Q1**: 영상 언어 방식 → **Option B 확정**
  - ~~Option A: 영어 내레이션 (TTS 또는 직접 녹음)~~
  - **Option B: YouTube CC 자막** (SRT 별도 업로드, 번인 없음, 최소 안내 자막)

- [ ] **Q2**: 녹화 환경 (`DEMO_URL`)
  - Option A: 배포된 공개 URL에서 Playwright 실행 (실제 환경 증명) → **권장**
  - Option B: 로컬에서 Playwright 실행 (안정적, 지연↓)

- [ ] **Q3**: 배속 전략
  - Option A: 전체 균일 배속 (ffmpeg `setpts` 단일 계수) → 간단, 빠름 → **권장 (MVP)**
  - Option B: 구간별 가변 배속 (중요 장면 1x, 대기/로딩 5x) → 품질↑, 구현 복잡↑

## 참고 자료

- Devpost 제출 요건: "demonstration video", "not longer than 3 minutes", "English or English subtitles", "YouTube (recommended) or Vimeo"
- `vibe/prd.md` §7 - 사용자 여정 (데모 시나리오 참조)
- `vibe/prd.md` §6.8 - 에이전트 동작 가시화 (기술 하이라이트 참조)
- Devpost 심사 기준: Presentation/Demo(10%), Technical Execution(40%), Innovation/Wow Factor(30%)
