# U-030[Mvp] nanobanana mcp 에셋 SSOT 실행 가이드

## 1. 개요

`nanobanana mcp`로 생성되는 UI/문서용 이미지 에셋의 **저장 위치/네이밍/사이즈/성능 예산/폴백/라이선스**를 프로젝트 SSOT로 정의했습니다. 이 런북은 정의된 규칙이 올바르게 설정되었는지 확인하고, 향후 에셋 추가 시 참조할 수 있는 가이드를 제공합니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-004[Mvp] (CRT 테마/고정 레이아웃)
- 선행 완료 필요: 없음 (독립적으로 검증 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프로젝트 루트로 이동
cd d:/Dev/unknown-world

# 프론트엔드 의존성 설치 (이미 설치된 경우 생략)
pnpm -C frontend install
```

### 2.2 디렉토리 구조 확인

```bash
# SSOT 디렉토리 존재 확인
ls frontend/public/ui/

# 예상 출력:
# manifest.json
# manifest.schema.json
# README.md
```

### 2.3 프론트엔드 개발 서버 실행

```bash
# RULE-011: 포트 8001~8010 사용
pnpm -C frontend dev

# → http://localhost:8001 에서 접근 가능
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: SSOT 디렉토리 구조 검증

**목적**: 에셋 SSOT 경로와 필수 파일이 올바르게 생성되었는지 확인

**실행**:
```bash
# 디렉토리 구조 확인
tree frontend/public/ui/ 2>/dev/null || ls -la frontend/public/ui/
```

**기대 결과**:
```
frontend/public/ui/
├── manifest.json
├── manifest.schema.json
└── README.md
```

**확인 포인트**:
- ✅ `frontend/public/ui/` 디렉토리 존재
- ✅ `README.md` 파일 존재 (SSOT 규칙 문서)
- ✅ `manifest.schema.json` 파일 존재 (에셋 스키마)
- ✅ `manifest.json` 파일 존재 (에셋 목록, 초기 빈 상태)

---

### 시나리오 B: README.md 규칙 문서 검증

**목적**: SSOT 규칙 문서가 핵심 항목을 포함하는지 확인

**실행**:
```bash
# 핵심 섹션 존재 확인
grep -E "^## [0-9]+\." frontend/public/ui/README.md
```

**기대 결과**:
```
## 1. 핵심 원칙
## 2. 디렉토리 구조
## 3. 네이밍 규칙
## 4. 포맷 및 사이즈 규칙
## 5. 성능 예산
## 6. 스타일 가이드
## 7. 폴백 원칙 (필수)
## 8. 접근성 가이드
## 9. 에셋 제작 워크플로우
## 10. 매니페스트 관리
## 11. 라이선스
## 12. 체크리스트 (에셋 추가 시)
```

**확인 포인트**:
- ✅ Dev-only 원칙 (RULE-007) 명시
- ✅ 용어 SSOT (RULE-006) 명시
- ✅ 보안 규칙 (RULE-005) 명시
- ✅ 네이밍 규칙 (`kebab-case`) 정의
- ✅ 성능 예산 (개별/총합) 정의
- ✅ 폴백 원칙 및 예시 코드 포함

---

### 시나리오 C: manifest.schema.json 유효성 검증

**목적**: JSON Schema가 유효한지 확인

**실행**:
```bash
# JSON 문법 검증
node -e "console.log(JSON.parse(require('fs').readFileSync('frontend/public/ui/manifest.schema.json', 'utf8')).$id)"
```

**기대 결과**:
```
https://unknown-world.dev/schemas/ui-asset-manifest.json
```

**확인 포인트**:
- ✅ JSON 문법 오류 없음
- ✅ `$schema` 참조 포함
- ✅ `Asset` 정의 포함 (id, path, type 필수)
- ✅ 성능 예산 기본값 정의 (`budgetBytes: 1572864`)

---

### 시나리오 D: manifest.json 스키마 적합성 검증

**목적**: 초기 manifest.json이 스키마를 준수하는지 확인

**실행**:
```bash
# 기본 구조 확인
node -e "const m = JSON.parse(require('fs').readFileSync('frontend/public/ui/manifest.json', 'utf8')); console.log('version:', m.version, '| assets:', m.assets.length, '| budget:', m.budgetBytes)"
```

**기대 결과**:
```
version: 1.0.0 | assets: 0 | budget: 1572864
```

**확인 포인트**:
- ✅ `version` 필드 존재 (SemVer 형식)
- ✅ `assets` 배열 존재 (초기 빈 배열)
- ✅ `budgetBytes` 정의 (1.5MB)
- ✅ `$schema` 참조 포함

---

### 시나리오 E: CRT 테마 색상 참조 확인

**목적**: README.md가 style.css의 CRT 테마 색상을 올바르게 참조하는지 확인

**실행**:
```bash
# style.css의 CSS 변수와 README.md의 참조 비교
grep -E "^\s*--text-color:" frontend/src/style.css
grep "#33ff00" frontend/public/ui/README.md
```

**기대 결과**:
```
  --text-color: #33ff00; /* 주 텍스트: 인광 녹색 (CRT 그린) */
--text-color: #33ff00;    /* 인광 녹색 */
```

**확인 포인트**:
- ✅ CRT 인광 녹색 (`#33ff00`) 일치
- ✅ 배경색 (`#0d0d0d`) 일치
- ✅ 마젠타 (`#ff00ff`) 일치

---

### 시나리오 F: 브라우저에서 에셋 경로 접근 확인

**목적**: 정적 에셋이 브라우저에서 접근 가능한지 확인

**전제 조건**: 프론트엔드 개발 서버 실행 중

**실행**:
1. 브라우저에서 `http://localhost:8001/ui/README.md` 접근
2. 브라우저에서 `http://localhost:8001/ui/manifest.json` 접근

**기대 결과**:
- README.md 내용이 텍스트로 표시됨
- manifest.json 내용이 JSON으로 표시됨

**확인 포인트**:
- ✅ `/ui/` 경로로 정적 에셋 접근 가능
- ✅ CORS/보안 차단 없음

---

### 시나리오 G: PRD/Roadmap 문서 정합성 확인

**목적**: SSOT 규칙이 PRD 및 Roadmap과 일치하는지 확인

**실행**:
```bash
# PRD에서 nanobanana mcp 관련 섹션 확인
grep -A5 "9.7 UI 이미지 에셋 파이프라인" vibe/prd.md 2>/dev/null || grep "nanobanana mcp" vibe/prd.md | head -5

# Roadmap에서 U-030 상태 확인
grep "U-030" vibe/roadmap.md
```

**기대 결과**:
- PRD 9.7에 nanobanana mcp 에셋 파이프라인 규칙 존재
- Roadmap에 U-030 작업 항목 존재

**확인 포인트**:
- ✅ SSOT 경로 (`frontend/public/ui/`) 일치
- ✅ 네이밍 규칙 일치
- ✅ 성능 예산 일치
- ✅ Dev-only 원칙 일치

---

## 4. 실행 결과 확인

### 4.1 생성된 파일 목록

| 파일 | 목적 | 상태 |
|------|------|------|
| `frontend/public/ui/README.md` | SSOT 규칙 문서 | ✅ 생성됨 |
| `frontend/public/ui/manifest.schema.json` | 에셋 스키마 | ✅ 생성됨 |
| `frontend/public/ui/manifest.json` | 에셋 목록 (초기 빈 상태) | ✅ 생성됨 |

### 4.2 규칙 요약

| 항목 | 규칙 |
|------|------|
| SSOT 경로 | `frontend/public/ui/` |
| 네이밍 | `kebab-case` + 용도 + 크기 (예: `signal-24.png`) |
| 아이콘 포맷 | PNG (투명) |
| Placeholder 포맷 | WebP (Q1 결정: Option B) |
| 아이콘 예산 | 개별 20KB 이하, 필수 사이즈 16/24 |
| Placeholder 예산 | 개별 200KB 이하 |
| 총합 예산 | 1MB 이하 (권장), 1.5MB (상한) |
| 폴백 | 필수 (이모지/텍스트) |
| Dev-only | 런타임 MCP 의존 금지 |

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ `frontend/public/ui/` 디렉토리 존재
- ✅ README.md에 12개 핵심 섹션 포함
- ✅ manifest.schema.json이 유효한 JSON Schema
- ✅ manifest.json이 스키마 준수
- ✅ CRT 테마 색상 참조 일치
- ✅ 브라우저에서 `/ui/` 경로 접근 가능

**실패 시 확인**:
- ❌ 디렉토리 없음 → `mkdir -p frontend/public/ui` 실행
- ❌ 파일 없음 → 해당 파일 재생성
- ❌ JSON 문법 오류 → JSON 검증 후 수정

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ENOENT: no such file or directory`
- **원인**: 디렉토리 또는 파일이 없음
- **해결**: `mkdir -p frontend/public/ui` 후 파일 재생성

**오류**: `SyntaxError: Unexpected token`
- **원인**: JSON 문법 오류
- **해결**: JSON 검증 도구로 확인 후 수정

**오류**: 브라우저에서 404
- **원인**: 개발 서버 미실행 또는 경로 오류
- **해결**: 
  1. `pnpm -C frontend dev` 실행
  2. `/ui/` 경로 확인 (Vite public 폴더 기준)

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 `/` 사용 (JSON 내)
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

이 유닛 완료 후 다음 작업들이 U-030을 의존합니다:

- **U-029**: nanobanana mcp 에셋 패스 (아이콘/프레임/placeholder 실제 제작)
- **U-031**: 상태 Placeholder Pack
- **U-032**: UI Chrome Pack
- **U-033**: 에셋 매니페스트 + QA
- **U-034**: 에셋 요청 스키마 + 프롬프트 템플릿

---

_런북 버전: 1.0.0_
_작성일: 2026-01-10_
