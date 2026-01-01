# Unknown World 프론트엔드 스타일 가이드

## 개요

Unknown World는 **CRT 터미널 레트로** 미학을 기반으로 한 디자인 시스템을 사용합니다.
1980년대 녹색 인광 CRT 모니터의 향수를 불러일으키며, 미스터리한 "미지의 세계" 분위기를 연출합니다.

---

## 1. 디자인 철학

### 핵심 원칙

| 원칙                  | 설명                                                      |
| --------------------- | --------------------------------------------------------- |
| **레트로 퓨처리즘**   | 과거의 기술 미학과 미래적 신비감의 조화                   |
| **몰입형 인터페이스** | 게임과 UI의 경계를 흐리게 하여 사용자를 세계관에 몰입시킴 |
| **기능적 미니멀리즘** | 불필요한 장식 배제, 모든 요소가 목적을 가짐               |
| **접근성 우선**       | 레트로 미학을 유지하면서도 가독성과 사용성 보장           |

### 분위기 키워드

- 신비로움 (Mysterious)
- 복고풍 (Retro)
- 사이버펑크 (Cyberpunk)
- 터미널 (Terminal)
- 글리치 (Glitch)

---

## 2. 컬러 팔레트

### CSS 변수 정의

```css
:root {
  /* 기본 색상 */
  --bg-color: #0d0d0d; /* 배경: 거의 순수한 검정 */
  --text-color: #33ff00; /* 주 텍스트: 인광 녹색 (CRT 그린) */
  --text-dim: #1a8000; /* 보조 텍스트: 어두운 녹색 */
  --accent-color: #ff00ff; /* 강조색: 마젠타 */
  --border-color: #33ff00; /* 테두리: 인광 녹색 */

  /* CRT 효과 */
  --crt-scanline: rgba(18, 16, 16, 0.1);
  --crt-flicker: 0.03;
}
```

### 색상 사용 지침

| 색상                  | 용도                             | HEX                   |
| --------------------- | -------------------------------- | --------------------- |
| **Primary Green**     | 일반 텍스트, 테두리, 아이콘      | `#33ff00`             |
| **Dim Green**         | 비활성 텍스트, 그림자, 보조 요소 | `#1a8000`             |
| **Magenta**           | 호버 상태, 중요 알림, 강조       | `#ff00ff`             |
| **Deep Black**        | 배경                             | `#0d0d0d`             |
| **Transparent Green** | 패널 배경                        | `rgba(0, 20, 0, 0.3)` |

### 색상 사용 시 주의사항

- ⚠️ 밝은 색상 사용 최소화 (눈의 피로 방지)
- ⚠️ 텍스트에는 반드시 `text-shadow`로 글로우 효과 적용
- ⚠️ 마젠타는 호버/강조에만 제한적으로 사용

---

## 3. 타이포그래피

### 폰트 스택

```css
--font-main: 'NeoDonggeunmo', 'VT323', monospace;
```

### 폰트 정의

| 폰트              | 용도                | 출처                                                    |
| ----------------- | ------------------- | ------------------------------------------------------- |
| **NeoDonggeunmo** | 한글 텍스트 (1순위) | [눈누 폰트](https://noonnu.cc/font_page/36)             |
| **VT323**         | 영문 텍스트 (2순위) | [Google Fonts](https://fonts.google.com/specimen/VT323) |
| **monospace**     | 폴백                | 시스템 기본                                             |

### 폰트 로딩

```css
@font-face {
  font-family: 'NeoDonggeunmo';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.3/NeoDunggeunmo.woff')
    format('woff');
  font-weight: normal;
  font-display: swap; /* 폰트 로딩 중에도 텍스트 표시 */
}
```

### 폰트 크기 체계

| 요소       | 크기              | 용도          |
| ---------- | ----------------- | ------------- |
| **h1**     | `2rem` (32px)     | 페이지 타이틀 |
| **body**   | `1.2rem` (19.2px) | 일반 텍스트   |
| **input**  | `1.5rem` (24px)   | 사용자 입력   |
| **button** | `1.2rem` (19.2px) | 버튼 레이블   |
| **mobile** | 기본 `14px`       | 768px 이하    |

---

## 4. CRT 효과

### 스캔라인 오버레이

화면 전체에 CRT 모니터의 수평 스캔라인을 시뮬레이션합니다.

```css
#crt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 999;
  animation: flicker 0.15s infinite;
}
```

### 플리커(깜빡임) 애니메이션

오래된 모니터의 미세한 깜빡임을 재현합니다.

```css
@keyframes flicker {
  0% {
    opacity: 0.97;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.98;
  }
}
```

### 글리치 효과

타이틀에 적용되는 시각적 글리치 효과입니다.

```css
.glitch {
  position: relative;
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
}

.glitch::before {
  left: 2px;
  text-shadow: -1px 0 red;
  animation: glitch-anim-1 5s infinite linear alternate-reverse;
}

.glitch::after {
  left: -2px;
  text-shadow: -1px 0 blue;
  animation: glitch-anim-2 5s infinite linear alternate-reverse;
}
```

**사용법:**

```html
<h1 class="glitch" data-text="UNKNOWN WORLD">UNKNOWN WORLD</h1>
```

---

## 5. 레이아웃 구조

### 기본 레이아웃

```
┌─────────────────────────────────────────┐
│ HEADER                                  │
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Title (h1)      │ │ Status Bar      │ │
│ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────┤
│ MAIN (Terminal Window)                  │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │  게임 디스플레이 영역                  │ │
│ │  (스크롤 가능)                        │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ FOOTER (Input Area)                     │
│ ┌─────────────────────────────────────┐ │
│ │ > [입력창________________] [EXECUTE] │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Flexbox 구조

```css
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

main {
  flex: 1; /* 남은 공간 모두 차지 */
  overflow-y: auto; /* 내용이 넘치면 스크롤 */
}
```

---

## 6. 컴포넌트 스타일

### 버튼

```css
button {
  background: var(--text-color);
  color: var(--bg-color);
  border: none;
  padding: 0.5rem 1rem;
  font-family: var(--font-main);
  font-size: 1.2rem;
  cursor: pointer;
  text-transform: uppercase;
  font-weight: bold;
}

button:hover {
  background: var(--accent-color);
  color: white;
}
```

### 입력 필드

```css
input[type='text'] {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-color);
  font-family: var(--font-main);
  font-size: 1.5rem;
  outline: none;
  text-shadow: 0 0 5px var(--text-dim);
}
```

### 터미널 윈도우

```css
main {
  border: 1px solid var(--text-dim);
  padding: 1rem;
  background-color: rgba(0, 20, 0, 0.3);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
}
```

### 스크롤바

```css
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: var(--bg-color);
}

::-webkit-scrollbar-thumb {
  background: var(--text-dim);
  border: 1px solid var(--text-color);
}
```

---

## 7. 반응형 디자인

### 브레이크포인트

| 브레이크포인트 | 대상            |
| -------------- | --------------- |
| `768px` 이하   | 태블릿 & 모바일 |

### 모바일 조정

```css
@media (max-width: 768px) {
  :root {
    font-size: 14px; /* 기본 폰트 크기 축소 */
  }

  #app {
    padding: 0.5rem;
  }

  h1 {
    font-size: 1.5rem;
  }

  .prompt {
    font-size: 1.2rem;
  }

  input[type='text'] {
    font-size: 1.2rem;
  }

  button {
    font-size: 1rem;
    padding: 0.5rem;
  }
}
```

---

## 8. 애니메이션 가이드라인

### 허용되는 애니메이션

| 애니메이션  | 용도          | 속도  |
| ----------- | ------------- | ----- |
| **Flicker** | CRT 깜빡임    | 0.15s |
| **Glitch**  | 타이틀 글리치 | 5s    |
| **Blink**   | 커서 깜빡임   | 표준  |

### 애니메이션 원칙

1. **성능 우선**: GPU 가속 속성 (`transform`, `opacity`) 사용
2. **절제**: 과도한 애니메이션은 몰입감을 해침
3. **목적성**: 모든 애니메이션은 세계관 강화에 기여해야 함

---

## 9. 접근성 고려사항

### 색맹 대응

- 녹색/마젠타 조합은 대부분의 색각 이상에서 구분 가능
- 중요 정보는 색상 외에 텍스트로도 전달

### 시각적 피로 방지

- 어두운 배경에 제한된 밝은 색상 사용
- 스캔라인 효과는 subtle하게 유지

### 키보드 접근성

- 모든 인터랙티브 요소는 키보드로 접근 가능해야 함
- `Enter` 키로 명령 실행 지원

---

## 10. 파일 구조

```
frontend/
├── src/
│   ├── style.css      # 메인 스타일시트 (모든 스타일 포함)
│   ├── App.tsx        # 메인 컴포넌트
│   ├── main.tsx       # 엔트리 포인트
│   └── ...
├── index.html         # 외부 폰트 로드 (Google Fonts)
└── ...
```

### 스타일 관리 원칙

1. **단일 CSS 파일**: 프로젝트 규모상 단일 `style.css`로 관리
2. **CSS 변수 활용**: 테마 변경 용이성을 위해 CSS 변수 사용
3. **컴포넌트별 주석**: 관련 스타일을 주석으로 구분

---

## 11. 확장 가이드

### 새 컴포넌트 추가 시

1. 기존 CSS 변수 (`--text-color`, `--bg-color` 등) 사용
2. 레트로 터미널 미학 유지
3. 네온 글로우 효과 (`text-shadow`) 적용 고려
4. 호버 상태에 마젠타 강조색 사용

### 새 색상 추가가 필요한 경우

```css
:root {
  /* 기존 색상 유지하며 추가 */
  --warning-color: #ffaa00; /* 경고: 주황색 (레트로 터미널 호환) */
  --error-color: #ff3333; /* 에러: 붉은색 */
}
```

---

## 부록: 영감 자료

### 참고 미학

- 1980년대 IBM PC 모니터
- Fallout 시리즈 터미널 UI
- The Matrix 녹색 텍스트
- Cyberpunk 2077 UI

### 관련 자료

- [CRT Effect CSS Tutorial](https://aleclownes.com/2017/02/01/crt-display-effect.html)
- [VT323 Font](https://fonts.google.com/specimen/VT323)
- [NeoDonggeunmo 폰트](https://noonnu.cc/font_page/36)

---

_마지막 업데이트: 2025-11-30_
