# U-034[Mvp] nanobanana mcp 에셋 요청 스키마 + 프롬프트 템플릿 실행 가이드

## 1. 개요

`nanobanana mcp`로 에셋을 만들 때 **재현성**을 높이기 위해 **에셋 요청 스키마(JSON) + 프롬프트 템플릿**을 정의했습니다.
이 런북에서는 정의된 스키마/템플릿을 사용하여 실제로 에셋을 생성하는 과정을 검증합니다.

**예상 소요 시간**: 15분

**의존성**:
- 의존 유닛: U-030[Mvp] (에셋 SSOT/예산/규칙)
- 선행 완료 필요: U-030 런북 실행 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# rembg 설치 확인 (배경 제거 도구)
pip show rembg || pip install rembg

# rembg 모델 다운로드 (첫 실행 시)
rembg d isnet-anime
```

### 2.2 의존 유닛 확인

```bash
# U-030에서 생성된 에셋 SSOT 구조 확인
ls -la frontend/public/ui/

# 예상 결과:
# README.md
# manifest.json
# manifest.schema.json
```

### 2.3 산출물 확인

```bash
# 스키마 파일 확인
cat vibe/ref/nanobanana-asset-request.schema.json | head -20

# 가이드 문서 확인
head -50 vibe/ref/nanobanana-mcp.md
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 에셋 요청 스키마 유효성 검증

**목적**: JSON 스키마가 유효하고 예상 필드를 포함하는지 확인

**실행**:

```bash
# JSON 유효성 확인 (jq 사용)
cat vibe/ref/nanobanana-asset-request.schema.json | jq '.'

# 필수 필드 확인
cat vibe/ref/nanobanana-asset-request.schema.json | jq '.required'
```

**기대 결과**:

```json
["id", "category", "purpose", "size_px"]
```

**확인 포인트**:

- ✅ JSON 파싱 성공 (문법 오류 없음)
- ✅ 필수 필드 4개 존재 (`id`, `category`, `purpose`, `size_px`)
- ✅ `category` enum에 `icon`, `placeholder`, `chrome` 포함
- ✅ `rembg_model` 필드 존재 (배경 제거 모델 선택)

---

### 시나리오 B: 프롬프트 템플릿 확인

**목적**: 가이드 문서에 카테고리별 프롬프트 템플릿이 정의되어 있는지 확인

**실행**:

```bash
# 템플릿 섹션 확인
grep -n "TEMPLATE" vibe/ref/nanobanana-mcp.md

# 공통 아트 디렉션 헤더 확인
grep -A 10 "STYLE HEADER" vibe/ref/nanobanana-mcp.md
```

**기대 결과**:

```
# 템플릿 종류
[ICON TEMPLATE v1]
[PLACEHOLDER TEMPLATE v1]
[CHROME TEMPLATE v1]

# 공통 헤더
[STYLE HEADER v1]
CRT 레트로 터미널 스타일.
1980년대 인광 녹색(#33ff00) CRT 모니터 미학.
...
```

**확인 포인트**:

- ✅ 공통 스타일 헤더 (`STYLE HEADER v1`) 존재
- ✅ 배경 규칙 (`BACKGROUND RULE - rembg 전제`) 존재
- ✅ 카테고리별 템플릿 3종 (`ICON`, `PLACEHOLDER`, `CHROME`)

---

### 시나리오 C: nanobanana mcp 에셋 생성 테스트 (아이콘)

**목적**: 프롬프트 템플릿을 사용하여 실제로 아이콘을 생성하고 rembg로 배경 제거

**실행 순서**:

1. **Step 1**: nanobanana mcp로 아이콘 생성

   Cursor에서 nanobanana mcp 도구 호출:

   ```
   도구: mcp_nanobanana_generate_icon
   
   prompt: "CRT 레트로 터미널 스타일. 1980년대 인광 녹색(#33ff00) CRT 모니터 미학. 24x24 픽셀 아이콘. 안테나/전파 실루엣. 단순한 형태, 높은 대비. solid white background (#FFFFFF), no gradient/texture/shadow."
   type: "app-icon"
   sizes: [24, 64]
   style: "minimal"
   background: "white"
   format: "png"
   ```

   - 결과: 아이콘 이미지 파일 생성됨

2. **Step 2**: rembg로 배경 제거

   ```bash
   # 생성된 아이콘에 rembg 적용
   rembg i -m isnet-anime [생성된_파일경로].png frontend/public/ui/icons/signal-24.png
   ```

   - 결과: 투명 배경 PNG 생성됨

3. **Step 3**: 결과 확인

   ```bash
   # 파일 생성 확인
   ls -la frontend/public/ui/icons/

   # 파일 크기 확인 (30KB 이하 권장)
   du -h frontend/public/ui/icons/signal-24.png
   ```

   - 최종 산출물: 투명 배경 아이콘 PNG

**확인 포인트**:

- ✅ 아이콘 이미지 생성 성공
- ✅ rembg 배경 제거 성공 (투명 배경)
- ✅ 파일 크기 30KB 이하
- ✅ 인광 녹색 톤 유지

---

### 시나리오 D: Placeholder 생성 테스트

**목적**: placeholder 템플릿으로 상태 이미지 생성

**실행**:

```
도구: mcp_nanobanana_generate_image

prompt: "CRT 레트로 터미널 스타일. 1980년대 인광 녹색(#33ff00) CRT 모니터 미학. 스캔라인 느낌. 로딩 상태를 시각화. 512x384 픽셀. 미스터리한 분위기. 글리치 효과."
styles: ["vintage", "pixel-art"]
```

**기대 결과**:

- 레트로 스타일의 로딩 placeholder 이미지 생성

**확인 포인트**:

- ✅ 이미지 생성 성공
- ✅ CRT/레트로 톤 유지
- ✅ 텍스트 렌더링 없음 (또는 최소화)

---

## 4. 실행 결과 확인

### 4.1 생성된 파일

| 파일 경로 | 용도 |
|-----------|------|
| `vibe/ref/nanobanana-asset-request.schema.json` | 에셋 요청 스키마 |
| `vibe/ref/nanobanana-mcp.md` | 개발용 에셋 제작 가이드 |

### 4.2 스키마 주요 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | ✅ | 에셋 고유 ID (kebab-case) |
| `category` | enum | ✅ | icon/placeholder/chrome |
| `purpose` | string | ✅ | 에셋 용도 |
| `size_px` | int/object | ✅ | 크기 |
| `palette` | string[] | - | CRT 팔레트 |
| `background` | enum | - | transparent/solid_white/solid_black |
| `requires_rembg` | boolean | - | rembg 필요 여부 |
| `rembg_model` | enum | - | rembg 모델 선택 |

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ 스키마 JSON 유효
- ✅ 카테고리별 프롬프트 템플릿 3종 정의
- ✅ 공통 아트 디렉션 헤더 정의
- ✅ rembg 배경 제거 절차 문서화
- ✅ U-030(SSOT) 및 U-033(매니페스트)와 연결 명시

**실패 시 확인**:

- ❌ 스키마 파싱 오류 → JSON 문법 수정
- ❌ 템플릿 섹션 누락 → 가이드 문서 보완
- ❌ rembg 명령 실패 → 모델 다운로드 (`rembg d isnet-anime`)

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `rembg: command not found`

- **원인**: rembg 미설치
- **해결**: `pip install rembg`

**오류**: `Model not found: isnet-anime`

- **원인**: 모델 미다운로드
- **해결**: `rembg d isnet-anime`

**오류**: JSON 스키마 파싱 실패

- **원인**: JSON 문법 오류
- **해결**: `jq '.' < file.json`으로 오류 위치 확인

### 5.2 환경별 주의사항

- **Windows**: 경로에 한글 포함 시 rembg 오류 가능 → 영문 경로 사용
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

이 유닛을 기반으로 다음 작업에서 활용합니다:

1. **U-029**: 아이콘/프레임/placeholder 에셋 제작 시 이 템플릿 사용
2. **U-031**: 상태 Placeholder Pack 제작 시 PLACEHOLDER TEMPLATE 사용
3. **U-032**: UI Chrome Pack 제작 시 CHROME TEMPLATE 사용
4. **U-033**: 생성된 에셋을 manifest.json에 등록

---

_런북 버전: 1.0.0_
_작성일: 2026-01-11_
