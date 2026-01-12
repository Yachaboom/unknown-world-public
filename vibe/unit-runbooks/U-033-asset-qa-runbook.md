# U-033[Mvp] 에셋 매니페스트 + QA 실행 가이드

## 1. 개요

nanobanana mcp로 생성한 에셋의 추적(매니페스트)과 품질 보장(QA 체크리스트)을 위한 시스템을 구축했습니다. 이 런북은 에셋 추가/수정 시 반드시 수행해야 할 QA 절차와 매니페스트 업데이트 방법을 안내합니다.

**예상 소요 시간**: 에셋당 5~10분

**의존성**:
- 의존 유닛: U-030[Mvp] - 에셋 SSOT/예산 규칙
- 선행 완료 필요: `frontend/public/ui/` 디렉토리 존재

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
pnpm -C frontend install
```

### 2.2 프론트엔드 서버 실행

```bash
# 개발 서버 시작
pnpm -C frontend dev
# → http://localhost:8001 에서 접근 가능
```

### 2.3 에셋 디렉토리 확인

```bash
# 에셋 파일 목록 확인
ls -la frontend/public/ui/icons/
ls -la frontend/public/ui/placeholders/
ls -la frontend/public/ui/chrome/
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 매니페스트 정합성 검증

**목적**: manifest.json이 실제 파일과 일치하는지 확인

**실행 (PowerShell/Git Bash)**:

```bash
cd frontend/public/ui

# manifest.json에 있는 모든 path가 실제 파일로 존재하는지 확인
cat manifest.json | jq -r '.assets[].path' | while read p; do
  [ -f "$p" ] || echo "MISSING: $p"
done

# 실제 파일이 manifest.json에 등록되어 있는지 확인
find icons placeholders chrome -type f \( -name "*.png" -o -name "*.webp" \) | while read f; do
  grep -q "\"$f\"" manifest.json || echo "NOT IN MANIFEST: $f"
done
```

**기대 결과**:
- 출력 없음 = 정합성 OK
- `MISSING: ...` 또는 `NOT IN MANIFEST: ...` 출력 시 = 불일치 발생

**확인 포인트**:
- ✅ manifest.json의 모든 에셋 파일이 존재
- ✅ 실제 디렉토리의 모든 에셋이 manifest에 등록됨

---

### 시나리오 B: 용량 예산 검증

**목적**: 총 용량이 예산(1.5MB) 이하인지 확인

**실행**:

```bash
cd frontend/public/ui

# 총 용량 계산
find icons placeholders chrome -type f \( -name "*.png" -o -name "*.webp" \) \
  -exec stat --format='%s' {} \; | awk '{sum+=$1} END {print "Total:", sum, "bytes (" sum/1024 " KB)"}'

# manifest.json 확인
cat manifest.json | jq '{totalBytes, budgetBytes, usage_percent: (.totalBytes / .budgetBytes * 100 | round)}'
```

**기대 결과**:
```
{
  "totalBytes": 556534,
  "budgetBytes": 1572864,
  "usage_percent": 35
}
```

**확인 포인트**:
- ✅ `totalBytes` < `budgetBytes` (1,572,864 bytes = 1.5MB)
- ✅ 사용량 35% 이하 권장 (1MB 이하 = 67%)

---

### 시나리오 C: 개별 에셋 용량 검증

**목적**: 개별 에셋이 유형별 상한을 초과하지 않는지 확인

**실행**:

```bash
cd frontend/public/ui

# 아이콘 (상한 30KB)
echo "=== Icons (max 30KB) ===" && ls -la icons/*.png | awk '{if($5 > 30720) print "OVER:", $9, $5, "bytes"}'

# placeholder (상한 300KB)
echo "=== Placeholders (max 300KB) ===" && ls -la placeholders/*.{png,webp} 2>/dev/null | awk '{if($5 > 307200) print "OVER:", $9, $5, "bytes"}'

# chrome (상한 50KB)
echo "=== Chrome (max 50KB) ===" && ls -la chrome/*.png | awk '{if($5 > 51200) print "OVER:", $9, $5, "bytes"}'
```

**기대 결과**:
- 출력 없음 = 예산 준수
- `OVER: ...` 출력 시 = 해당 에셋 최적화 필요

**현재 알려진 이슈**:
- `scene-placeholder-default.png` (261KB) - PNG 포맷으로 예산 초과 없으나 WebP 변환 권장
- `scanner-frame.png` (100KB) - chrome 상한(50KB) 초과 → 최적화 권장

---

### 시나리오 D: 에셋 로드 및 폴백 테스트

**목적**: 브라우저에서 에셋이 정상 로드되고, 실패 시 폴백이 표시되는지 확인

**실행 순서**:

1. **프론트엔드 서버 시작**:
   ```bash
   pnpm -C frontend dev
   ```

2. **브라우저에서 확인** (http://localhost:8001):
   - Signal/Shard 아이콘이 Economy HUD에 표시됨
   - Action Deck에 risk 아이콘이 표시됨
   - Scene Canvas에 placeholder 이미지가 표시됨
   - Scanner 영역에 frame이 표시됨

3. **폴백 테스트** (개발자 도구에서):
   ```javascript
   // 존재하지 않는 이미지 로드 테스트
   const img = document.createElement('img');
   img.src = '/ui/icons/nonexistent.png';
   img.onerror = () => console.log('Fallback triggered!');
   document.body.appendChild(img);
   ```

4. **실제 폴백 테스트** (파일 임시 이동):
   ```bash
   # 아이콘 파일 임시 이름 변경
   mv frontend/public/ui/icons/signal-24.png frontend/public/ui/icons/signal-24.png.bak

   # 브라우저 새로고침 → 폴백 이모지 ⚡ 표시 확인

   # 파일 복원
   mv frontend/public/ui/icons/signal-24.png.bak frontend/public/ui/icons/signal-24.png
   ```

**기대 결과**:
- 에셋 파일 존재 시: 이미지 표시
- 에셋 파일 미존재 시: 폴백 이모지/텍스트 표시 (예: ⚡, 💎, ⚠)

**확인 포인트**:
- ✅ 이미지 로드 시 콘솔 에러 없음
- ✅ 이미지 미존재 시 폴백 표시, UI 깨짐 없음

---

### 시나리오 E: 16px 실루엣 테스트 (아이콘)

**목적**: 16px 아이콘이 작은 크기에서도 형태가 구분되는지 확인

**실행**:

1. 브라우저에서 http://localhost:8001 접속
2. DevTools > Elements > Styles에서 아이콘 크기를 16px로 강제:
   ```css
   .icon-img { width: 16px !important; height: 16px !important; }
   ```
3. 각 아이콘의 형태가 구분되는지 육안 확인
4. 특히 `risk-low-16.png`, `risk-high-16.png`, `risk-medium-16.png`가 서로 구분되는지 확인

**확인 포인트**:
- ✅ 16px에서 아이콘 실루엣 구분 가능
- ✅ 다른 아이콘과 혼동되지 않음

---

## 4. QA 체크리스트 사용법

### 4.1 체크리스트 위치

```
frontend/public/ui/QA_CHECKLIST.md
```

### 4.2 에셋 추가 시 체크 순서

1. **네이밍 규칙** 확인 (`kebab-case` + 용도 + 크기)
2. **포맷 규칙** 확인 (아이콘=PNG, placeholder=WebP)
3. **(조건부) 배경 제거** 실행 (rembg)
4. **용량 예산** 확인 (개별 + 총합)
5. **16px 실루엣** 확인 (아이콘)
6. **대비/Readable** 확인
7. **폴백 텍스트** 지정
8. **manifest.json** 업데이트

### 4.3 manifest.json 업데이트 예시

```json
{
  "id": "new-icon-24",
  "path": "icons/new-icon-24.png",
  "type": "icon",
  "size": 24,
  "fallback": "🆕",
  "usedIn": ["ComponentName"],
  "bytes": 1234,
  "notes": "nanobanana mcp 생성, rembg 배경 제거"
}
```

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 이미지가 로드되지 않음 (404)
- **원인**: path 경로 불일치 또는 파일 미존재
- **해결**: manifest.json의 path와 실제 파일 경로 확인

**오류**: 폴백이 표시되지 않음
- **원인**: `icon-fallback` 클래스 또는 CSS 누락
- **해결**: `onError` 핸들러와 CSS 규칙 확인

**오류**: 용량 초과 경고
- **원인**: 에셋 최적화 미흡
- **해결**: ImageMagick, TinyPNG 등으로 압축 또는 WebP 변환

### 5.2 배경 제거 관련

**오류**: rembg로 배경 제거 후 경계가 거침
- **원인**: 원본 배경이 복잡함 (그라데이션/텍스처)
- **해결**: 원본 생성 시 순백(#FFFFFF) 배경으로 재생성

**참조**: `vibe/ref/rembg-guide.md`

---

## 6. 성공/실패 판단 기준

**성공**:
- ✅ manifest.json 정합성 100% (누락/불일치 없음)
- ✅ 총 용량 1.5MB 이하
- ✅ 개별 에셋 유형별 상한 준수
- ✅ 브라우저에서 에셋 로드 성공
- ✅ 폴백 동작 정상

**실패 시 확인**:
- ❌ 정합성 불일치 → manifest.json 업데이트 또는 파일 추가/제거
- ❌ 용량 초과 → 에셋 최적화 (압축/WebP 변환/해상도 축소)
- ❌ 로드 실패 → 경로/파일명 확인
- ❌ 폴백 미동작 → CSS/JS 코드 확인

---

## 7. 참고 자료

- **SSOT 규칙**: `frontend/public/ui/README.md`
- **QA 체크리스트**: `frontend/public/ui/QA_CHECKLIST.md`
- **매니페스트 스키마**: `frontend/public/ui/manifest.schema.json`
- **배경 제거 가이드**: `vibe/ref/rembg-guide.md`
- **의존 유닛 보고서**: `vibe/unit-results/U-030[Mvp].md`
