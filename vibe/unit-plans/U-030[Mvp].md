# U-030[Mvp]: nanobanana mcp 에셋 SSOT(폴더/네이밍/사이즈/폴백/라이선스)

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-030[Mvp] |
| Phase     | MVP        |
| 예상 소요 | 45분       |
| 의존성    | U-004      |
| 우선순위  | High       |

## 작업 목표

`nanobanana mcp`로 생성되는 UI/문서용 이미지 에셋이 난립하지 않도록, **저장 위치/네이밍/사이즈/성능 예산/폴백/라이선스**를 프로젝트 SSOT로 정의한다.

**배경**: 에셋이 늘어날수록 “어디에 저장하는지/어떤 규칙으로 만드는지/성능에 어떤 영향을 주는지”가 흐려지면, UI 품질과 유지보수성이 급격히 떨어진다. 또한 `nanobanana mcp`는 개발 도구이므로, 런타임 의존/비밀정보 커밋 같은 리스크를 사전에 차단해야 한다.

**완료 기준**:

- `nanobanana mcp`로 제작한 정적 에셋의 **SSOT 경로**와 규칙이 문서화된다.
- 네이밍/사이즈/포맷/성능 예산(예: 총합/개별 파일 상한)과 **폴백 원칙(텍스트/이모지 유지)** 이 정의된다.
- 비밀정보(키/토큰) 커밋 금지, “dev-only 사용” 원칙이 명확히 적힌다. (red-line 연동)

## 영향받는 파일

**생성**:

- `frontend/public/ui/README.md` - UI 에셋 규칙(SSOT) 요약
- (선택) `frontend/public/ui/manifest.schema.json` - 에셋 매니페스트 규칙(키/파일명/사이즈)

**수정**:

- `vibe/prd.md` - “UI 이미지 에셋 파이프라인(nanobanana mcp)” 요구사항 명문화(요약)
- `vibe/roadmap.md` - nanobanana mcp 관련 유닛들의 의존성 기준(SSOT 선행) 반영

**참조**:

- `.gemini/rules/red-line.md` - RULE-006/007(용어/dev-only/보안)
- `vibe/ref/frontend-style-guide.md` - CRT 스타일 톤/변수 기반 원칙
- `frontend/src/style.css` - CSS 변수/아이콘 적용 방식(폴백 포함)

## 구현 흐름

### 1단계: SSOT 경로/포맷 규칙 확정

- SSOT 경로를 `frontend/public/ui/`로 고정한다(정적 서빙/캐싱 단순).
- 포맷은 기본 PNG(투명)로 하되, 필요 시 WebP는 선택(브라우저 호환/품질/크기 기준으로 결정).

### 2단계: 네이밍/사이즈/예산 규칙 정의

- 네이밍: `kebab-case` + 용도 + 크기(예: `signal-24.png`, `badge-ok-16.png`)
- 아이콘 사이즈: 16/24/32/64(최소 2종), 필요 시 `image-set()`로 1x/2x 제공
- 성능 예산(예시):
  - 아이콘 1개: 20KB 이하(권장)
  - placeholder 1개: 200KB 이하(권장)
  - `frontend/public/ui/` 총합: 1MB 이하(권장)

### 3단계: 폴백/접근성/라이선스 원칙 명문화

- 폴백: 로딩 실패/미지원 시에도 UI가 깨지지 않게 텍스트/이모지 라벨을 유지한다.
- 접근성: 의미 전달은 색상만으로 하지 않고(텍스트/라벨 병행), `aria-hidden`/`alt`를 의도에 맞게 적용한다.
- 라이선스/출처: 외부 로고/상표를 그대로 복제하지 않으며, 에셋은 “프로젝트 스타일”로 제작한다(브랜딩 혼동 방지).

### 4단계: 팀 사용 가이드(최소 런북) 작성

- “에셋 요청 → nanobanana mcp로 제작(**배경 제거가 필요하면 원본 배경은 순백(#FFFFFF) 단색으로 생성**) → (필요 시) `rembg`로 배경 제거 → 리사이즈/압축 → 폴더 반영 → UI 적용/폴백 확인”의 최소 절차를 `README.md`에 기록한다. (참조: `vibe/ref/rembg-guide.md`)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - CRT 테마/고정 레이아웃(에셋이 들어갈 UI 골격)
- **결과물**: `frontend/src/style.css`의 CSS 변수/테마 토큰(색/톤 기준)

**다음 작업에 전달할 것**:

- U-029/U-031~U-034에서 사용될 **에셋 저장/규칙 SSOT**
- PRD/레드라인에 연결되는 “dev-only 에셋 파이프라인” 기준선

## 주의사항

**기술적 고려사항**:

- `nanobanana mcp`는 개발 도구이며, 런타임(프론트/백엔드) 의존 설계는 금지한다. (red-line RULE-007)
- 비밀정보(키/토큰)는 레포/문서/로그에 남기지 않는다. (red-line RULE-005)

**잠재적 리스크**:

- 에셋이 커지면 초기 로딩/캐시가 악화 → 예산 상한과 폴백(필요 지점만 적용) 원칙을 강제한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: placeholder(상태 이미지)는 PNG로 고정할까, WebP를 허용할까?
  - Option A: PNG 고정(단순/예측 가능)
  - Option B: placeholder만 WebP 허용(용량 절감) — 단, 브라우저 호환/품질 기준 필요
  **A1**: Option B

## 참고 자료

- `.gemini/rules/red-line.md` - 용어/보안/dev-only 규칙
- `vibe/prd.md` - 데모 표면/접근성/CRT 효과 원칙
- `vibe/ref/frontend-style-guide.md` - CRT 스타일 가이드
- `vibe/ref/rembg-guide.md` - rembg 배경 제거(모델 선택/옵션/명령) 가이드

