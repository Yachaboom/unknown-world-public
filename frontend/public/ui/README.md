# UI 에셋 가이드 (nanobanana mcp SSOT)

> **SSOT 경로**: `frontend/public/ui/`  
> **도구**: `nanobanana mcp` (개발 전용, 런타임 의존 금지)  
> **참조**: `.gemini/rules/red-line.md` RULE-006/007, `vibe/prd.md` 9.7, `vibe/ref/rembg-guide.md`

---

## 1. 핵심 원칙

### 1.1 Dev-only 원칙 (RULE-007)

- `nanobanana mcp`는 **개발 과정에서 정적 에셋을 제작**하는 도구입니다.
- 제품 런타임(프론트/백엔드)에서 MCP에 의존하는 설계는 **금지**합니다.
- 생성된 에셋은 이 디렉토리(`frontend/public/ui/`)에 커밋하여 정적 배포합니다.

### 1.2 용어 SSOT (RULE-006)

- 이 도구는 반드시 **`nanobanana mcp`** 로 표기합니다.
- "나노바나나 MCP", "Nano Banana MCP", "banana mcp" 등 혼용 금지.
- 모델 별칭("Nano Banana / Nano Banana Pro")은 문서 인용 시에만 제한적 사용.

### 1.3 보안 (RULE-005)

- 키/토큰 등 비밀정보를 레포/로그/문서에 남기지 않습니다.
- 생성 과정에서 사용한 API 키나 인증 정보는 절대 커밋하지 않습니다.

---

## 2. 디렉토리 구조

```
frontend/public/ui/
├── README.md              # 이 파일 (SSOT 규칙)
├── manifest.schema.json   # 에셋 매니페스트 스키마
├── manifest.json          # (생성 시) 실제 에셋 목록
├── icons/                 # 아이콘 에셋
│   ├── signal-16.png
│   ├── signal-24.png
│   ├── badge-ok-16.png
│   └── ...
├── placeholders/          # 상태/장면 placeholder
│   ├── scene-loading.webp
│   ├── scene-error.webp
│   └── ...
└── chrome/                # UI 프레임/장식
    ├── panel-corner-tl.png
    ├── panel-border-h.png
    └── ...
```

---

## 3. 네이밍 규칙

### 3.1 기본 포맷

```
{용도}-{크기}.{확장자}
{용도}-{상태}-{크기}.{확장자}
```

**예시**:
- `signal-24.png` — Signal 아이콘, 24px
- `badge-ok-16.png` — OK 배지, 16px
- `scene-loading.webp` — 로딩 상태 placeholder

### 3.2 규칙

| 항목 | 규칙 |
|------|------|
| **케이스** | `kebab-case` (소문자 + 하이픈) |
| **용도** | 명확한 역할 표현 (signal, badge, scene, panel 등) |
| **상태** | 필요 시 상태 포함 (ok, fail, loading, error 등) |
| **크기** | 픽셀 단위 숫자 (16, 24, 32, 64 등) |
| **확장자** | 용도에 맞게 선택 (아래 참조) |

---

## 4. 포맷 및 사이즈 규칙

### 4.1 포맷 선택

| 용도 | 기본 포맷 | 대안 | 비고 |
|------|-----------|------|------|
| **아이콘** | PNG (투명) | - | 작은 크기, 투명도 필수 |
| **placeholder** | WebP | PNG | 용량 절감 우선 (Q1 결정: Option B) |
| **chrome** | PNG (투명) | - | 프레임/장식, 투명도 필수 |

> **배경 제거(필수 조건부)**: 아이콘/chrome 등 투명 배경이 필요한 에셋은 생성 결과에 배경이 남아 있으면 `rembg`로 배경을 제거해 투명 PNG로 정리합니다. (가이드: `vibe/ref/rembg-guide.md`)

### 4.2 사이즈 규격

| 용도 | 필수 사이즈 | 선택 사이즈 | 비고 |
|------|-------------|-------------|------|
| **아이콘** | 16, 24 | 32, 64 | 최소 2종 필수 |
| **placeholder** | 가변 | - | 용도별 적정 크기 |
| **chrome** | 가변 | - | 타일링/반복 고려 |

### 4.3 Retina 대응 (선택)

- 필요 시 `image-set()`으로 1x/2x 제공
- 파일명: `{name}-24.png`, `{name}-24@2x.png`

---

## 5. 성능 예산

| 항목 | 상한 | 권장 |
|------|------|------|
| **아이콘 1개** | 30KB | 20KB 이하 |
| **placeholder 1개** | 300KB | 200KB 이하 |
| **chrome 1개** | 50KB | 30KB 이하 |
| **`ui/` 폴더 총합** | 1.5MB | 1MB 이하 |

**초과 시 대응**:
1. 압축/최적화 (TinyPNG, ImageOptim 등)
2. 해상도/색상 축소
3. 불필요 에셋 제거
4. 예산 상향 시 근거 문서화 필요

---

## 6. 스타일 가이드

### 6.1 CRT 테마 연동

에셋은 `frontend/src/style.css`의 CSS 변수/테마와 조화를 이뤄야 합니다.

```css
/* 참조: CRT 테마 색상 */
--bg-color: #0d0d0d;      /* 배경 */
--text-color: #33ff00;    /* 인광 녹색 */
--text-dim: #1a8000;      /* 어두운 녹색 */
--accent-color: #ff00ff;  /* 마젠타 */
--warning-color: #ffaa00; /* 주황색 */
--error-color: #ff3333;   /* 붉은색 */
```

### 6.2 스타일 원칙

| 원칙 | 설명 |
|------|------|
| **레트로 퓨처리즘** | CRT/터미널 미학과 조화 |
| **기능적 미니멀리즘** | 불필요한 장식 배제 |
| **톤 일관성** | 인광 녹색 기반, 마젠타 포인트 |
| **고대비** | Readable 모드에서도 식별 가능 |

### 6.3 금지 사항

- ❌ 프로젝트 외부 로고/상표 복제
- ❌ CRT 테마와 충돌하는 색상 (밝은 파스텔, 난색 계열 남용)
- ❌ 복잡한 그라데이션/사진 스타일

---

## 7. 폴백 원칙 (필수)

### 7.1 텍스트/이모지 폴백 유지

에셋 로딩 실패/미지원 시에도 **UI가 깨지지 않도록** 텍스트/이모지 라벨을 유지해야 합니다.

**예시** (React):
```tsx
<span className="icon-wrapper" aria-label="Signal">
  <img 
    src="/ui/icons/signal-24.png" 
    alt="" 
    aria-hidden="true"
    onError={(e) => e.currentTarget.style.display = 'none'}
  />
  <span className="icon-fallback">📡</span>
</span>
```

**CSS**:
```css
.icon-wrapper {
  display: inline-flex;
  align-items: center;
}
.icon-wrapper img + .icon-fallback {
  display: none;
}
.icon-wrapper img[style*="display: none"] + .icon-fallback {
  display: inline;
}
```

### 7.2 폴백 요구사항

| 에셋 유형 | 폴백 방식 |
|-----------|-----------|
| **아이콘** | 이모지 또는 텍스트 라벨 |
| **placeholder** | CSS 배경색 + 텍스트 |
| **chrome** | CSS border/shadow로 대체 |

---

## 8. 접근성 가이드

### 8.1 필수 사항

| 항목 | 요구사항 |
|------|----------|
| **색상만으로 의미 전달 금지** | 텍스트/라벨 병행 |
| **장식성 이미지** | `aria-hidden="true"` 적용 |
| **기능성 이미지** | `alt` 텍스트 제공 또는 `aria-label` |
| **대비** | Readable 모드에서도 4.5:1 이상 |

### 8.2 예시

```html
<!-- 장식용 아이콘 (의미 없음) -->
<img src="/ui/chrome/corner.png" alt="" aria-hidden="true" />

<!-- 기능용 아이콘 (의미 있음) -->
<button aria-label="신호 전송">
  <img src="/ui/icons/signal-24.png" alt="Signal" />
</button>
```

---

## 9. 에셋 제작 워크플로우

### 9.1 요청 → 제작 → 적용

```
1. 요청 정의
   └── 용도, 사이즈, 스타일 명세 작성
   
2. nanobanana mcp로 제작
   └── 프롬프트에 CRT 스타일 키워드 포함
   └── 색상 팔레트 준수
   └── (필수 조건부) 배경 제거(rembg) 예정이면 **배경은 순백(#FFFFFF) 단색**으로 생성(그라데이션/텍스처/그림자 금지)

3. (필수 조건부) rembg로 배경 제거
   └── 아이콘/chrome 등 투명 배경이 필요한 에셋에서 배경이 남아 있으면 rembg로 제거
   └── 모델 선택/옵션은 `vibe/ref/rembg-guide.md` 준수
  
4. 리사이즈/압축
   └── 성능 예산 확인
   └── 필요 사이즈로 리사이즈
  
5. 디렉토리 반영
   └── 네이밍 규칙 준수
   └── manifest.json 업데이트
  
6. UI 적용 + 폴백 확인
   └── 컴포넌트에 적용
   └── 폴백 동작 테스트
  
7. QA
   └── 크기/대비/폴백/Readable 모드 확인
```

### 9.2 프롬프트 가이드 (예시)

```
CRT 터미널 스타일 아이콘, 
인광 녹색(#33ff00) 기반, 
검은 배경(#0d0d0d)에 어울리는 톤,
심플한 라인 아트, 
픽셀 아트 또는 레트로 스타일,
24x24 픽셀, 투명 배경
(배경 제거 필요 시) solid white background (#FFFFFF), no gradient/texture/shadow
```

---

## 10. 매니페스트 관리

### 10.1 manifest.json

모든 에셋은 `manifest.json`에 등록하여 추적합니다.

```json
{
  "$schema": "./manifest.schema.json",
  "version": "1.0.0",
  "assets": [
    {
      "id": "signal-24",
      "path": "icons/signal-24.png",
      "type": "icon",
      "size": 24,
      "fallback": "📡",
      "usedIn": ["EconomyHUD"],
      "bytes": 1234
    }
  ]
}
```

### 10.2 업데이트 시점

- 에셋 추가/제거 시 manifest.json 동기화
- U-033에서 QA 자동화 예정

---

## 11. 라이선스

- 모든 에셋은 **프로젝트 내부 용도**로 제작됩니다.
- 외부 로고/상표를 복제하지 않습니다.
- `nanobanana mcp`로 생성된 에셋은 도구의 라이선스 정책을 따릅니다.
- 에셋에 **SynthID 워터마크**가 포함될 수 있습니다 (AI 생성 표기).

---

## 12. 체크리스트 (에셋 추가 시)

- [ ] 네이밍 규칙 준수 (`kebab-case` + 용도 + 크기)
- [ ] 포맷 규칙 준수 (아이콘=PNG, placeholder=WebP)
- [ ] 성능 예산 준수 (개별/총합)
- [ ] (조건부) 투명 배경이 필요한 에셋은 `rembg`로 배경 제거 완료(알파 채널 확인)
- [ ] (조건부) 배경 제거(rembg) 예정이면 원본 생성 단계에서 배경이 순백(#FFFFFF) 단색인지 확인(그라데이션/텍스처/그림자 금지)
- [ ] CRT 테마 색상과 조화
- [ ] 폴백 구현 확인
- [ ] 접근성 속성 적용 (`aria-hidden` 또는 `alt`)
- [ ] manifest.json 업데이트
- [ ] Readable 모드에서 대비 확인

---

_마지막 업데이트: 2026-01-10_
_문서 버전: 1.0.0_
