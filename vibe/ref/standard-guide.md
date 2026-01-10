## 리소스 탭: “권장 방향(심사 취지에 가까운 것)” 정리 (Devpost 공식 안내 기반)

### 1) 출발점: “무엇을 만들면 심사 취지에 맞는가”

- 이번 해커톤은 **“텍스트 기반 채팅 UI 하나”를 넘어서** Gemini 3의 강점을 드러내는 **고충실도(high-fidelity) 애플리케이션**을 기대한다고 명시합니다. :contentReference[oaicite:0]{index=0}
- Gemini 3를 **단순 챗봇이 아니라 ‘멀티모달 추론 엔진’**으로 규정하며, “보고(vision)·듣고(audio)·실시간으로 세계를 이해”하는 능력을 활용해 **감지(sense)하고 반응(react)하는 제품**을 만들라고 안내합니다. :contentReference[oaicite:1]{index=1}
- 또한 “Gemini 3의 출시는 **정적(static) 채팅에서, 계획·실행하는 자율 에이전트로 전환되는 ‘Action Era’**를 상징한다”는 관점을 전면에 둡니다. 즉, **장시간 실행·다단계 작업·자율적 검증** 같은 ‘시스템’ 지향 구현을 요구합니다. :contentReference[oaicite:2]{index=2}

---

### 2) 강하게 비권장(We strongly discourage)하는 프로젝트 유형

리소스 탭은 아래 유형을 “강하게 비권장”으로 명시합니다. 핵심 메시지는 “**한 번의 프롬프트로 해결되는 것은 앱이 아니다**—견고한 시스템/오케스트레이터를 보여달라”입니다. :contentReference[oaicite:3]{index=3}

1. **Baseline RAG**
   - Gemini 3 Pro는 매우 큰 컨텍스트(예: 대규모 문서/코드베이스를 한 번에 다루는 수준)를 전제로 하며,
   - 단순 검색/요약 수준의 데이터 리트리벌은 이제 “베이스라인”이므로, 그 이상(추론/오케스트레이션/행동)을 보여 달라는 취지입니다. :contentReference[oaicite:4]{index=4}

2. **Prompt Only Wrappers**
   - “기본 UI에 시스템 프롬프트를 감싼 정도”의 앱은 비권장입니다.
   - 즉, UI만 다르고 내부는 사실상 프롬프트 1장으로 동작하는 형태를 피하라는 의미입니다. :contentReference[oaicite:5]{index=5}

3. **Simple Vision Analyzers**
   - 단순 객체 인식/식별 같은 수준은 “구식”으로 보고,
   - 시간 축을 포함한 비디오 이해, 인과(cause-effect)까지 보는 **시공간(spatial-temporal) 이해** 같은 고급 활용을 기대한다고 적고 있습니다. :contentReference[oaicite:6]{index=6}

4. **Generic Chatbots**
   - 영양 상담, 채용 스크리닝, 성격 분석 등 “전형적인 봇” 형태는 비권장입니다.
   - 요지는 “또 하나의 챗봇”이 아니라 **새로운 사용자 경험과 시스템 설계**를 요구한다는 것입니다. :contentReference[oaicite:7]{index=7}

5. **Medical Advice**
   - 의료/정신건강 관련 “진단적 조언”을 생성하는 프로젝트는 금지/비권장 범주로 명시합니다. :contentReference[oaicite:8]{index=8}

---

### 3) Strategic Tracks (권장 방향의 예시 프레임)

리소스 탭은 아래 트랙을 “시장성 + 기술 깊이” 관점의 예시로 제시하며, **여기서 더 창의적으로 확장하라**고 안내합니다. :contentReference[oaicite:9]{index=9}  
(표현은 “이 프롬프트를 그대로 따라 하라”가 아니라, **Gemini 3 Pro의 잠재력을 보여주는 방향성**입니다.) :contentReference[oaicite:10]{index=10}

#### A. The Marathon Agent

- 목표: **수시간~수일**에 걸친 장기 태스크를 수행하는 **자율 시스템** 구축
- 포인트: 긴 작업에서 “연속성 유지/자기 수정”이 중요하며, 이를 위해 **Thought Signatures / Thinking Levels** 등을 활용해 다단계 툴 콜을 사람 개입 없이 수행하는 방향을 제시합니다. :contentReference[oaicite:11]{index=11}
  - 하위 예시: **Vibe Engineering**
    - Google AI Studio의 **Build 탭**과 **Google Antigravity**를 활용하라고 제안합니다.
    - 단순히 코드를 “작성”하는 에이전트가 아니라, **자율 테스트 루프 + 브라우저 기반 검증 아티팩트**(실행/검증 흔적)를 남기는 에이전트를 지향하라고 설명합니다. :contentReference[oaicite:12]{index=12}

#### B. The Real-Time Teacher

- 목표: **Gemini Live API**를 활용해 **라이브 비디오/오디오**를 합성·이해하고,
- 사용자에게 맞게 **실시간 적응형 학습 경험**을 제공하는 방향을 제시합니다. :contentReference[oaicite:13]{index=13}

#### C. Creative Autopilot

- 목표: Gemini 3의 추론을 **nanobanana mcp** 같은 멀티모달 생성/편집(개발용 에셋 제작 도구)과 결합해,
- “고정밀(High-precision) 제작”을 수행하는 **크리에이티브 오토파일럿**을 만들라는 방향입니다.
- 특히 **더 높은 해상도**, **국소적(Paint-to-Edit) 편집 컨트롤**, **브랜드 일관성**, **가독성 있는 텍스트** 등 “프로덕션 품질의 에셋 생성”을 강조합니다. :contentReference[oaicite:14]{index=14}

---

### 4) (참고) 리소스 탭이 함께 제공하는 시작 가이드 성격의 안내

- “무료 티어는 AI Studio에서만 제공”되며, 시작점으로 AI Studio의 **Build 탭**과 **Gallery 템플릿**을 권합니다. :contentReference[oaicite:15]{index=15}
- 추가로 Gemini API 문서/Antigravity/관련 영상 링크를 리소스로 제공합니다. :contentReference[oaicite:16]{index=16}
