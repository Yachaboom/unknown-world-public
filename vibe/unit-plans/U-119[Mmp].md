# U-119[Mmp]: Frontend Layout 전체 다듬기 (WIG 기반 폴리시)

## 메타데이터

| 항목      | 내용                                          |
| --------- | --------------------------------------------- |
| Unit ID   | U-119[Mmp]                                    |
| Phase     | MMP                                           |
| 예상 소요 | 90분                                          |
| 의존성    | None (현재 MVP 코드 기반)                     |
| 우선순위  | ⚡ Critical (제출 첫인상 결정, Innovation 30%) |

## 작업 목표

**Web Interface Guidelines(WIG) 스킬을 활용**하여 프론트엔드 게임 UI의 전체 레이아웃을 해커톤 심사 기준에 맞게 다듬는다. 패널 정렬·간격, 타이포그래피 계층, 반응형 대응, 접근성, CRT 테마 밸런스(가독성 vs 분위기)를 종합 점검하고 개선하여 **"채팅 앱이 아닌 게임 UI"의 첫인상을 극대화**한다.

**배경**: Devpost 심사 기준에서 Innovation/Wow Factor(30%) + Technical Execution(40%)가 전체 70%를 차지한다. UI의 첫인상이 "프롬프트 래퍼가 아닌 완성도 높은 게임"으로 보이는 것이 핵심이다. WIG(Web Interface Guidelines)는 Vercel Labs의 웹 인터페이스 모범 사례를 체계적으로 점검하는 스킬로, 접근성·반응형·인터랙션 품질을 한 번에 끌어올린다. CRT 테마 특성상 WIG의 일부 권장사항과 충돌할 수 있으므로 "게임 UI" 맥락에서의 의도적 예외를 문서화한다.

**완료 기준**:

- WIG 스킬로 주요 컴포넌트(App, GameLayout, EconomyHud, ActionDeck, SceneCanvas, AgentConsole, InventoryPanel)를 점검하고 Critical/Major 이슈 수정
- 1366x768(기본 뷰포트)에서 불필요한 스크롤 없이 핵심 패널이 모두 보임
- 패널 간 간격/정렬이 CSS 변수 기반으로 일관됨
- 타이포그래피 계층(제목/본문/힌트/배지)이 시각적으로 명확히 구분됨
- CRT 효과가 "분위기"를 살리되 critical 영역(재화/비용/배지/선택지/입력)의 가독성을 해치지 않음
- 모바일(768px 이하)에서 주요 패널이 합리적으로 스택/축소됨
- WCAG AA 기본 접근성(색상 대비 4.5:1, 포커스 표시, 키보드 탐색) 기본 수준 충족

## 영향받는 파일

**수정**:

- `frontend/src/style.css` - CSS 변수/글로벌 스타일 미세 조정 (패널 간격 변수 통일, 타이포 계층, CRT 강도 토큰)
- `frontend/src/components/GameLayout.tsx` - 메인 그리드/flex 비율 조정 (Scene:Side:Footer)
- `frontend/src/components/EconomyHud.tsx` - HUD 영역 정렬/크기/여백 개선
- `frontend/src/components/ActionDeck.tsx` - 카드 레이아웃/간격/반응형 개선
- `frontend/src/components/SceneCanvas.tsx` - Scene 영역 비율/반응형 개선
- `frontend/src/components/AgentConsole.tsx` - 콘솔 패널 크기/접기 UX 개선
- `frontend/src/components/InventoryPanel.tsx` - Row 정렬/간격 개선
- 기타 WIG 점검에서 발견되는 컴포넌트

**참조**:

- WIG 스킬 소스: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- `vibe/ref/frontend-style-guide.md` - CRT 테마/가독성 가이드 (SSOT)
- `vibe/prd.md` §9 - 프론트엔드 UX/스타일
- `.cursor/rules/10-frontend-game-ui.mdc` - 프론트엔드 규칙

## 구현 흐름

### 1단계: WIG 스킬로 현황 점검

- WIG 스킬을 실행하여 핵심 7개 컴포넌트를 Web Interface Guidelines 기준으로 점검
- 발견된 이슈를 **Critical/Major/Minor** 로 분류
- CRT 테마와 충돌하는 권장사항은 "의도적 예외(Intentional deviation: game UI aesthetic)"로 마킹
- Critical/Major 이슈 목록을 작성하고 수정 우선순위 결정

### 2단계: 레이아웃/그리드 개선

- GameLayout 메인 그리드의 영역 비율 재조정 (Scene:Side:Footer)
- 패널 간 간격(gap)을 CSS 변수(`--panel-gap`, `--section-gap`)로 통일
- 1366x768 뷰포트에서 스크롤 없이 핵심 UI가 모두 보이는지 확인/조정
- 패널 오버플로우/중첩 스크롤 제거 (PRD 9.3: 패널 콘텐츠 단위 스크롤)
- 각 패널의 최소/최대 높이를 뷰포트 비율로 제한

### 3단계: 타이포그래피·색상·CRT 밸런스

- 타이포그래피 계층이 시각적으로 구분되는지 확인 (font-size/weight/color 변수 정리)
- CRT 효과 강도를 **critical/ambient 영역**에 따라 미세 조정:
  - Critical(재화/비용/배지/선택지): scanline/flicker 최소화, 대비 강화
  - Ambient(배경/장식/Scene 오버레이): CRT 효과 유지
- 색상 대비(WCAG AA: 4.5:1)가 텍스트/배지/버튼에서 충족되는지 Devtools로 확인
- 라이트/다크 테마 모두에서 확인

### 4단계: 반응형·접근성·인터랙션

- 모바일(768px 이하)에서 패널 스택/축소가 합리적인지 확인
- 키보드 Tab 탐색 순서가 논리적인지 확인 (Action Deck → Input → Scene → Inventory)
- 포커스 링(focus-visible)이 CRT 테마에서도 잘 보이는지 확인
- hover/active/focus 상태의 시각적 피드백 일관성 확인
- `prefers-reduced-motion: reduce` 시 플리커/글리치 비활성화 확인

### 5단계: 최종 검증

- WIG 스킬 재실행으로 Critical/Major 이슈 해소 확인
- 1366x768, 1920x1080, 768px 이하 각각에서 스크린샷 비교
- dark/light 테마 모두에서 가독성 확인
- 핵심 인터랙션(Action 클릭, DnD, 핫스팟, Scanner) 정상 동작 재검증

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **현재 UI 코드**: MVP에서 구현된 전체 프론트엔드 레이아웃 (115개 유닛 결과)
- **스타일 가이드**: `vibe/ref/frontend-style-guide.md` (CRT 테마 기준, CSS 변수 정의)

**다음 작업에 전달할 것**:

- **U-122[Mmp]**: 데모 영상에 사용할 "다듬어진 UI" 기준선
- **U-107[Mmp]** (M6): 심층 접근성/모바일 UX 개선의 기반 (U-119는 1차 패스, U-107은 심층 2차 패스)

## 주의사항

**기술적 고려사항**:

- (PRD 9.1) CRT 테마 정체성을 유지하면서 가독성을 해치지 않는 밸런스가 핵심. "CRT 끄기"가 아닌 "영역별 강도 분리"
- (RULE-003 / R-003) UI가 채팅처럼 보이지 않게 고정 HUD/게임 레이아웃을 강조하는 방향으로 다듬기
- WIG 점검 결과 중 CRT 게임 UI와 충돌하는 권장사항은 **의도적 예외**로 문서화 (예: 스캔라인 오버레이 → 게임 미학)
- CSS 변수 기반 스타일링 유지, 컴포넌트별 인라인 스타일 추가 금지 (PRD 9.6)
- `pointer-events: none`으로 CRT 오버레이가 상호작용을 방해하지 않는지 재확인

**잠재적 리스크**:

- WIG 점검 결과가 방대할 수 있음 → **Critical/Major만 우선 수정**, Minor는 후속(U-107)으로 이관
- CRT 효과 약화가 "게임스러운 분위기" 손실로 이어질 수 있음 → ambient 영역은 효과 유지, critical 영역만 가독성 강화
- 레이아웃 변경이 기존 기능(DnD, 핫스팟 클릭, Scanner 드롭)에 영향을 줄 수 있음 → 변경 후 핵심 인터랙션 재검증 필수

## 페어링 질문 (결정 필요)

- [ ] **Q1**: WIG 점검 범위를 어디까지 할 것인가?
  - Option A: 전체 컴포넌트 (포괄적이지만 시간 소요↑)
  - Option B: 핵심 7개 컴포넌트만 (GameLayout, EconomyHud, ActionDeck, SceneCanvas, AgentConsole, InventoryPanel, Header) → **권장 (시간 제한 고려)**

- [ ] **Q2**: CRT 효과 강도 조정 기준은?
  - Option A: WCAG AA 기준 충족을 최우선 (CRT 약화 가능)
  - Option B: CRT 분위기 유지를 최우선 (일부 접근성 타협) → **권장 (게임 특성상, 심사자 Wow Factor)**

## 참고 자료

- [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) - WIG 스킬 소스
- `vibe/ref/frontend-style-guide.md` - CRT 테마 가이드 (SSOT)
- `vibe/prd.md` §9 - 프론트엔드 UX/스타일
- `.cursor/rules/10-frontend-game-ui.mdc` - 프론트엔드 규칙
- Devpost 심사 기준: Technical Execution(40%), Innovation/Wow Factor(30%)
