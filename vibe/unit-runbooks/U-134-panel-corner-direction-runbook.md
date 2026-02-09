# U-134[Mvp] Panel Corner 이미지 방향 수정 실행 가이드

## 1. 개요

`panel-corner-br.png`(BR 방향 코너 이미지)를 CSS `transform: rotate()`로 4방향(TL/TR/BL/BR)에 적용할 때, 회전값이 잘못되어 있던 6곳을 올바른 값으로 수정했습니다. 이 수정으로 모든 패널/헤더 코너가 시각적으로 정확한 방향을 향합니다.

**예상 소요 시간**: 3분

**의존성**:

- 의존 유닛: U-032[Mvp] (UI Chrome Pack — 패널 코너 이미지 원본, CSS 적용 구조)
- 선행 완료 필요: U-032[Mvp] 완료 상태

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
- 프로필(Narrator/Explorer/Tech Expert) 선택하여 게임 UI 진입
- 성공 지표: 사이드바 패널 코너 장식이 4방향 모두 올바른 방향을 향함

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 우측 사이드바 패널 코너 확인

**목적**: Agent Console, Economy Status, Scanner 패널의 코너 방향 검증

**실행**:

1. 브라우저에서 `http://localhost:8001` 접속
2. 프로필 선택하여 게임 UI 진입
3. 오른쪽 사이드바의 "Agent Console", "Economy Status", "Scanner" 패널 확인

**기대 결과**:

- 패널 헤더 좌상단 코너: ┌ 방향 (BR 원본 180° 회전)
- 패널 헤더 우상단 코너: ┐ 방향 (BR 원본 270° 회전)
- 패널 콘텐츠 좌하단 코너: └ 방향 (BR 원본 90° 회전)
- 패널 콘텐츠 우하단 코너: ┘ 방향 (BR 원본 그대로)

**확인 포인트**:

- ✅ 4개 코너가 각각 올바른 방향의 브래킷(┌ ┐ └ ┘)을 표시
- ✅ 녹색 글로우 효과(drop-shadow) 유지
- ✅ 코너 장식이 패널 테두리와 시각적으로 정합

---

### 시나리오 B: 좌측 사이드바 패널 코너 확인

**목적**: Inventory, Quest, Rule Board 패널의 코너 방향 검증

**실행**:

1. 왼쪽 사이드바의 "Inventory", "Quest", "Rule Board" 패널 확인

**기대 결과**:

- 시나리오 A와 동일한 4방향 코너 장식

**확인 포인트**:

- ✅ 좌측 패널도 우측과 동일하게 4방향 코너 정합
- ✅ 패널 크기에 관계없이 코너 위치 정확

---

### 시나리오 C: Game Header 코너 확인

**목적**: 최상단 게임 헤더의 좌우 코너 방향 검증

**실행**:

1. 화면 최상단 "UNKNOWN WORLD" 헤더 바 확인

**기대 결과**:

- 좌상단: ┌ 방향 (180° 회전)
- 우상단: ┐ 방향 (270° 회전)

**확인 포인트**:

- ✅ 헤더 양쪽 상단 코너가 올바른 방향
- ✅ 글로우 효과 유지

---

### 시나리오 D: Readable 모드 연동 확인

**목적**: Readable 모드에서도 수정된 방향이 유지되는지 확인

**실행**:

1. 헤더의 Readable 모드 토글(있는 경우) 활성화
2. 코너 장식 확인

**기대 결과**:

- 코너 방향은 동일하게 유지
- opacity/glow만 완화

**확인 포인트**:

- ✅ Readable 모드에서 코너 방향 유지
- ✅ 가독성 모드 효과(opacity 감소, glow 제거)는 기존과 동일

---

## 4. 실행 결과 확인

### 4.1 수정 파일

- `frontend/src/style.css` — Chrome 코너 CSS `transform: rotate()` 값 6곳 수정 + 주석 정확화

### 4.2 변경 내역 (수정 전 → 수정 후)

| 위치 | 셀렉터 | 수정 전 | 수정 후 | 의미 |
|------|--------|---------|---------|------|
| Game Header TL | `.game-header.has-chrome::before` | `90deg` | `180deg` | ┌ |
| Game Header TR | `.game-header.has-chrome::after` | `180deg` | `270deg` | ┐ |
| Panel Header TL | `.panel-header.has-chrome::before` | `90deg` | `180deg` | ┌ |
| Panel Header TR | `.panel-header.has-chrome::after` | `180deg` | `270deg` | ┐ |
| Panel Content BL | `.panel.has-chrome .panel-content::before` | `0deg` | `90deg` | └ |
| Panel Content BR | `.panel.has-chrome .panel-content::after` | `270deg` | `0deg` | ┘ |

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ 6곳 모두 올바른 방향의 코너 브래킷 표시
- ✅ CSS 회전만으로 충분(신규 이미지 불필요)
- ✅ 린트/타입 체크 무결성 통과
- ✅ 기존 Readable 모드 연동 유지

**실패 시 확인**:

- ❌ 코너가 보이지 않음 → `panel-corner-br.png` 파일 존재 확인, CSS 변수 `--chrome-panel-corner` 확인
- ❌ 방향이 여전히 이상함 → 개발자 도구에서 `transform` 속성값 직접 확인, 위 변경 내역 표 참조

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 코너 장식이 표시되지 않음

- **원인**: 이미지 파일 경로 오류 또는 CSS 변수 누락
- **해결**:
  1. `frontend/public/ui/chrome/panel-corner-br.png` 파일 존재 확인
  2. `style.css`에서 `--chrome-panel-corner` 변수 확인
  3. 개발 서버 재시작

**오류**: 코너 방향이 여전히 틀림

- **원인**: 브라우저 캐시
- **해결**: 하드 리프레시(Ctrl+Shift+R) 또는 캐시 삭제 후 재확인

### 5.2 환경별 주의사항

- **Windows/macOS/Linux**: 동일 동작 (CSS-only 수정이므로 OS 의존성 없음)
- **브라우저 호환성**: `transform: rotate()`는 모든 최신 브라우저에서 지원됨

---

## 6. 다음 단계

- U-119[Mmp]: WIG 폴리시에서 패널 코너 일관성 최종 점검 항목으로 포함
- CP-MVP-03: 데모 루프에서 패널 코너 방향 시각 검증
