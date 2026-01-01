# 프론트엔드(Game UI) 세부 지침

> **[적용 컨텍스트]**: frontend, ui, react, vite, typescript, zustand, dnd, hotspot, canvas, inventory, action-deck, quest, rule-board, agent-console, crt, css, *.ts, *.tsx, *.css
> 
> **[설명]**: 채팅 앱으로 보이지 않게 “게임 UI + 상호작용(핫스팟/드래그/덱/콘솔)”을 고정하고, TurnOutput(JSON) 기반으로 렌더링한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “프론트엔드(Game UI)” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 채팅 버블 UI 금지, 고정 레이아웃(게임 HUD) 유지

**설명**: PRD의 하드 게이트는 “챗봇 래퍼가 아닌 게임 시스템”이다. 텍스트는 채팅이 아니라 게임 로그/내레이션 피드로 보이게 한다.

**올바른 예시 (Do ✅)**:
```
- Header: Seed / Language Toggle / Theme Toggle / Economy HUD / 연결상태(로딩/TTFB)
- Center: Scene Canvas(이미지) + Hotspot Overlay + Hover tooltip
- Side: Inventory(DnD) / Quest / Rule Board / Memory Pin / Scanner Slot(이미지 드랍) / Agent Console(Plan·Queue·Badges)
- Footer: Action Deck(3~6 cards, cost/risks/rewards) + (선택) 커스텀 커맨드 입력
```

**잘못된 예시 (Don't ❌)**:
```
- 대화 말풍선(assistant/user) 타임라인이 화면의 핵심 UI
- 선택지를 채팅 메시지 버튼으로만 표시
```

### 규칙 2: 상호작용은 "클릭 + 드래그 + 업로드"가 눈에 보이게

**설명**: 심사자가 “대화”가 아니라 “조작”을 보도록, 클릭/드래그/스캐너 슬롯이 항상 동작해야 한다.

**올바른 예시 (Do ✅)**:
```
- Hotspot 클릭: object_id + box_2d(0~1000) 기반으로 상호작용 트리거
- Inventory DnD: 아이템을 Scene 오브젝트 위로 드랍하여 사용/조합
- Scanner Dropzone: 이미지 드랍/업로드 → 단서/아이템화 결과를 인벤토리에 반영
```

**잘못된 예시 (Don't ❌)**:
```
- "드래그해서 사용"은 텍스트로만 안내하고 실제 UI는 없음
- Hotspot이 DOM에서 보이지 않거나 클릭 불가능
```

### 규칙 3: 좌표/핫스팟은 0~1000 정규화 좌표계를 끝까지 유지

**설명**: PRD는 bbox 포맷과의 호환을 요구한다. 프론트는 렌더링 시점에만 실제 픽셀로 변환한다.

**올바른 예시 (Do ✅)**:
```
- 서버/세이브: box_2d = [ymin, xmin, ymax, xmax] (0~1000)
- 렌더: viewport_w/h에 맞춰 box_2d를 px로 변환 후 overlay 그리기
```

**잘못된 예시 (Don't ❌)**:
```
- 서버가 px 좌표(예: 142, 87, 220, 160)를 직접 반환
- bbox 순서를 [xmin,ymin,xmax,ymax]로 바꿔버림
```

### 규칙 4: CRT 테마는 CSS 변수 기반(단일 CSS)으로 유지

**설명**: 색/테마는 컴포넌트별 임의 설정 금지. scanline/overlay는 상호작용을 방해하지 않게 한다.

**올바른 예시 (Do ✅)**:
```
- data-theme="dark|light" 토글 + CSS 변수로만 색상 제어
- CRT overlay는 pointer-events: none
- 텍스트는 text-shadow로 글로우 적용
```

**잘못된 예시 (Don't ❌)**:
```
- 컴포넌트별로 임의의 HEX 컬러 하드코딩
- scanline overlay가 클릭/드래그를 가로챔
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 접근성(가독성) 문제**: CRT 효과(글로우/스캔라인)를 약화할 수 있으나, 레이아웃/채팅 금지 원칙은 유지한다.
</exceptions>

## 3. 체크리스트

- [ ] 화면에 Action Deck / Inventory(DnD) / Quest / Rule Board / Economy HUD / Memory Pin / Scanner Slot / Agent Console이 존재한다
- [ ] Scene Canvas + Hotspot Overlay가 존재한다
- [ ] 채팅 버블 UI가 없다 (내레이션은 로그 피드)
- [ ] Hotspot box_2d는 [ymin,xmin,ymax,xmax] + 0~1000 정규화 규약을 지킨다
- [ ] 테마는 CSS 변수 기반이며, overlay는 pointer-events: none이다


