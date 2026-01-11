# U-032[Mvp] Chrome Pack(패널/카드 프레임/코너) 실행 가이드

## 1. 개요

`nanobanana mcp`로 제작한 UI Chrome 에셋(패널 코너 장식, 액션 카드 프레임)을 게임 UI에 적용하여 "게임스러움"을 강화했습니다. 에셋은 투명 PNG로 배경 제거(rembg)되었으며, CSS를 통해 Panel Header와 Action Card에 적용됩니다. Readable 모드에서는 Chrome 효과가 완화됩니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-030[Mvp] (에셋 SSOT), U-004[Mvp] (레이아웃), U-034[Mvp] (템플릿)
- 선행 완료 필요: 위 유닛들이 완료된 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 즉시 실행

```bash
pnpm dev --port 8001
```

### 2.3 첫 화면 확인

- 브라우저에서 `http://localhost:8001` 접속
- 성공 지표: 오른쪽 사이드바 패널(Agent Console, Memory Pin, Scanner)에 코너 장식이 표시됨

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Panel Header Chrome 확인

**목적**: 패널 헤더에 코너 장식이 적용되었는지 확인

**실행**:

1. 브라우저에서 `http://localhost:8001` 접속
2. 오른쪽 사이드바의 "Agent Console", "Memory Pin", "Scanner" 패널 확인

**기대 결과**:

- 패널 헤더 좌우 상단에 녹색 인광 코너 장식이 표시됨
- 패널 콘텐츠 좌우 하단에도 코너 장식이 표시됨
- 코너 장식에 녹색 글로우 효과가 적용됨

**확인 포인트**:

- ✅ 4개의 코너에 장식이 표시됨
- ✅ CSS transform으로 각 방향에 맞게 회전됨
- ✅ 글로우 효과(drop-shadow)가 적용됨

---

### 시나리오 B: Action Card Chrome 확인

**목적**: 액션 카드에 프레임 오버레이가 적용되었는지 확인

**실행**:

1. 화면 하단의 Action Deck 확인
2. "탐색하기", "조사하기", "대화하기" 카드 확인

**기대 결과**:

- 각 카드 주변에 녹색 프레임 오버레이가 표시됨
- 프레임에 글로우 효과가 적용됨

**확인 포인트**:

- ✅ 프레임이 카드 경계 밖으로 4px 확장됨
- ✅ 글로우 효과가 적용됨

---

### 시나리오 C: Chrome 호버 효과 확인

**목적**: 액션 카드 호버 시 Chrome 효과 강화 확인

**실행**:

1. 아무 액션 카드 위에 마우스를 올림

**기대 결과**:

- 카드 테두리가 마젠타(#ff00ff)로 변경됨
- Chrome 프레임의 글로우 효과가 마젠타로 강화됨 (opacity 1, 더 밝은 글로우)

**확인 포인트**:

- ✅ 호버 시 Chrome 프레임이 더 밝아짐
- ✅ 글로우 색상이 마젠타로 변경됨

---

### 시나리오 D: Readable 모드 연동 확인

**목적**: Readable 모드에서 Chrome 효과가 완화되는지 확인

**실행**:

1. 헤더의 "○ READ" 버튼 클릭하여 Readable 모드 활성화 ("◉ READ"로 변경)
2. 패널 코너 장식과 액션 카드 프레임 확인

**기대 결과**:

- Chrome 효과의 불투명도가 감소함 (0.3~0.4 수준)
- 글로우(drop-shadow) 효과가 제거됨
- CRT 스캔라인 오버레이가 사라짐

**확인 포인트**:

- ✅ Chrome 효과가 시각적으로 완화됨
- ✅ 가독성이 향상됨
- ✅ 버튼을 다시 클릭하면 Chrome 효과 복원

---

### 시나리오 E: 폴백 동작 확인

**목적**: 에셋 로딩 실패 시 기존 CSS 스타일로 폴백되는지 확인

**실행**:

1. 개발자 도구(F12) → Network 탭 열기
2. `/ui/chrome/panel-corner-br.png` 요청을 Block 처리
3. 페이지 새로고침

**기대 결과**:

- Chrome 에셋이 로드되지 않아도 패널 테두리(기본 CSS border)가 유지됨
- UI가 깨지지 않고 정상 표시됨

**확인 포인트**:

- ✅ 에셋 없이도 패널 기본 스타일 유지
- ✅ 사용자 경험에 치명적 영향 없음

---

## 4. 실행 결과 확인

### 4.1 생성 파일

- `frontend/public/ui/chrome/panel-corner-br.png` - 패널 코너 에셋 (투명 PNG)
- `frontend/public/ui/chrome/card-frame.png` - 카드 프레임 에셋 (투명 PNG)

### 4.2 수정 파일

- `frontend/src/style.css` - Chrome CSS 추가 (섹션 24)
- `frontend/src/App.tsx` - Panel에 `hasChrome` prop 적용, ActionCard에 `has-chrome` 클래스 추가
- `frontend/public/ui/manifest.json` - Chrome 에셋 등록

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ Panel Header에 4방향 코너 장식 표시
- ✅ Action Card에 프레임 오버레이 표시
- ✅ 호버 시 Chrome 효과 강화
- ✅ Readable 모드에서 Chrome 완화
- ✅ 린트/타입 체크 통과

**실패 시 확인**:

- ❌ 에셋이 보이지 않음 → 파일 경로 및 CSS url() 확인
- ❌ 글로우 효과 없음 → filter: drop-shadow 지원 확인
- ❌ 호버 효과 없음 → :hover pseudo-class 및 z-index 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: Chrome 에셋이 표시되지 않음

- **원인**: 파일 경로 오류 또는 서버 재시작 필요
- **해결**: 
  1. `frontend/public/ui/chrome/` 디렉토리에 파일 존재 확인
  2. 개발 서버 재시작: `pnpm dev --port 8001`

**오류**: 코너 장식 위치가 맞지 않음

- **원인**: CSS transform 회전 각도 오류
- **해결**: `style.css`의 `.panel-header.has-chrome::before/after` transform 값 확인

**오류**: Readable 모드에서 Chrome이 완전히 사라지지 않음

- **원인**: 정상 동작 (완화만 함, 완전 제거 아님)
- **해결**: 필요시 `html[data-readable='true']` 규칙에서 `display: none` 추가

---

## 6. 다음 단계

이 유닛을 기반으로 다음 작업을 진행할 수 있습니다:

1. **U-009**: Action Deck 실제 카드 렌더링 시 Chrome 프레임 활용
2. **U-022**: Scanner 슬롯에 별도 Chrome 에셋 적용 (선택)
3. **U-033**: manifest.json 자동화 및 QA 스크립트 확장
