# UI 에셋 QA 체크리스트

> **참조**: `frontend/public/ui/README.md` (SSOT 규칙), `vibe/ref/rembg-guide.md` (배경 제거)  
> **목적**: nanobanana mcp로 생성한 에셋의 품질/일관성 보장  
> **적용 시점**: 에셋 추가/수정 시 반드시 체크

---

## 1. 용량 예산 (Performance Budget)

### 1.1 개별 에셋 상한

| 유형            | 상한  | 권장       | 체크 항목         |
| --------------- | ----- | ---------- | ----------------- |
| **아이콘**      | 30KB  | 20KB 이하  | `bytes` 필드 확인 |
| **placeholder** | 300KB | 200KB 이하 | `bytes` 필드 확인 |
| **chrome**      | 120KB | 30KB 이하  | `bytes` 필드 확인 |

### 1.2 총합 예산

| 항목     | 값                                  |
| -------- | ----------------------------------- |
| **상한** | 1.5MB (1,572,864 bytes)             |
| **권장** | 1MB (1,048,576 bytes) 이하          |
| **현재** | `manifest.json`의 `totalBytes` 확인 |

### 1.3 용량 초과 시 대응

1. **압축/최적화**: TinyPNG, ImageMagick, WebP 변환
2. **해상도/색상 축소**: 필요 사이즈만 유지
3. **불필요 에셋 제거**: 사용처 없는 에셋 정리
4. **예산 상향**: 근거 문서화 후 `budgetBytes` 조정

---

## 2. 사이즈/규격 (Size)

### 2.1 아이콘 사이즈 체크

| 항목            | 요구                 | 체크 |
| --------------- | -------------------- | ---- |
| **필수 사이즈** | 16px, 24px 최소 2종  | ☐    |
| **선택 사이즈** | 32px, 64px (필요 시) | ☐    |
| **정방형**      | 가로 = 세로          | ☐    |

### 2.2 16px 실루엣 테스트 ⚠️

> **중요**: 16px에서도 형태가 구분되어야 합니다.

**테스트 방법**:

1. 16px 아이콘을 100% 배율로 표시
2. 2m 거리에서 형태 구분 가능 여부 확인
3. 다른 아이콘과 혼동되지 않는지 확인

**실패 시 대응**:

- 디테일 단순화
- 외곽선/실루엣 강화
- 16px/24px 별도 디자인 (사용처 분리)

### 2.3 placeholder/chrome 사이즈

| 항목            | 권장                     | 비고               |
| --------------- | ------------------------ | ------------------ |
| **placeholder** | 512x384 또는 용도별 적정 | 가로세로 비율 유지 |
| **chrome**      | 타일링 가능 사이즈       | 48px, 64px 등      |

---

## 3. 대비/가독성 (Contrast)

### 3.1 기본 대비 테스트

| 모드         | 배경                    | 요구 대비               | 체크 |
| ------------ | ----------------------- | ----------------------- | ---- |
| **기본**     | `#0d0d0d` (어두운 배경) | 인광 녹색(#33ff00) 대비 | ☐    |
| **Readable** | 대비 강화 모드          | 4.5:1 이상              | ☐    |

### 3.2 대비 검증 방법

```
도구: WebAIM Contrast Checker
URL: https://webaim.org/resources/contrastchecker/

전경색: 아이콘 주요 색상
배경색: #0d0d0d (CRT 배경)
목표: 4.5:1 이상 (AA 기준)
```

### 3.3 Readable 모드 호환

- [ ] CRT 글로우/스캔라인 OFF 시에도 식별 가능
- [ ] 텍스트 라벨이 이미지를 방해하지 않음
- [ ] 색약/색맹 접근성 고려 (색상만으로 의미 전달 금지)

---

## 4. 투명 배경 (Alpha Channel)

### 4.1 투명 배경 필요 여부

| 유형            | 투명 필수 | 배경 색상        |
| --------------- | --------- | ---------------- |
| **아이콘**      | ✅ 필수   | 투명 (알파 채널) |
| **placeholder** | ❌ 선택   | 불투명 허용      |
| **chrome**      | ✅ 필수   | 투명 (알파 채널) |

### 4.2 배경 제거 체크 (rembg)

> **참조**: `vibe/ref/rembg-guide.md`

**생성 단계 요구 (조건부)**:

- [ ] 배경 제거 예정인 에셋은 **순백(#FFFFFF) 단색 배경**으로 생성
- [ ] 그라데이션/텍스처/그림자 배경 금지

**배경 제거 실행**:

- [ ] `rembg i -m birefnet-general <input> <output>` 실행
- [ ] 알파 채널 존재 확인 (GIMP/Photoshop/Preview)
- [ ] 경계 부분 잔여 배경 없음 확인

### 4.3 투명도 검증 명령어

```bash
# ImageMagick으로 알파 채널 확인
magick identify -verbose <image.png> | grep -i alpha

# 또는 파일 정보 확인 (PNG 포맷)
file <image.png>  # PNG image data, ... RGBA
```

---

## 5. 폴백 (Fallback)

### 5.1 폴백 텍스트/이모지 체크

| 체크 항목         | 요구  | 설명                               |
| ----------------- | ----- | ---------------------------------- |
| **fallback 필드** | 필수  | manifest.json에 `fallback` 값 존재 |
| **이모지/텍스트** | 1~2자 | 예: `📡`, `⚠`, `✓`, `OK`           |
| **의미 전달**     | 명확  | 원본 아이콘과 동일한 의미          |

### 5.2 폴백 동작 테스트

**테스트 시나리오**:

1. 에셋 파일을 임시로 삭제/이름 변경
2. 브라우저에서 UI 로드
3. 폴백 텍스트/이모지가 표시되는지 확인
4. UI가 깨지지 않는지 확인

**코드 구현 확인**:

```tsx
// 예상 패턴
<img
  src="/ui/icons/signal-24.png"
  alt=""
  aria-hidden="true"
  onError={(e) => (e.currentTarget.style.display = 'none')}
/>
<span className="icon-fallback">📡</span>
```

---

## 6. 매니페스트 동기화 (manifest.json)

### 6.1 필수 필드 체크

| 필드       | 필수 | 체크                              |
| ---------- | ---- | --------------------------------- |
| `id`       | ✅   | kebab-case, 고유값                |
| `path`     | ✅   | `ui/` 기준 상대 경로              |
| `type`     | ✅   | `icon` / `placeholder` / `chrome` |
| `fallback` | 권장 | 이모지/텍스트                     |
| `bytes`    | 권장 | 파일 크기                         |
| `usedIn`   | 권장 | 사용처 컴포넌트 목록              |
| `notes`    | 선택 | QA/생성 관련 메모                 |

### 6.2 실제 파일과 매니페스트 정합성

- [ ] manifest.json의 모든 에셋이 실제 파일로 존재
- [ ] 실제 디렉토리의 모든 에셋이 manifest.json에 등록됨
- [ ] `path` 경로가 실제 파일 위치와 일치
- [ ] `bytes` 값이 실제 파일 크기와 일치

### 6.3 정합성 검증 스크립트 (참고)

```bash
# manifest.json에 있는 path들이 실제로 존재하는지 확인
cd frontend/public/ui
cat manifest.json | jq -r '.assets[].path' | while read p; do
  [ -f "$p" ] || echo "MISSING: $p"
done

# 실제 파일이 manifest에 있는지 확인
find icons placeholders chrome -type f \( -name "*.png" -o -name "*.webp" \) | while read f; do
  grep -q "\"$f\"" manifest.json || echo "NOT IN MANIFEST: $f"
done
```

---

## 7. 스타일 일관성 (CRT Theme)

### 7.1 색상 팔레트 준수

| 색상        | Hex       | 용도        | 체크 |
| ----------- | --------- | ----------- | ---- |
| 인광 녹색   | `#33ff00` | 주요 색상   | ☐    |
| 어두운 녹색 | `#1a8000` | 보조 색상   | ☐    |
| 마젠타      | `#ff00ff` | 포인트/경고 | ☐    |
| 주황색      | `#ffaa00` | 경고        | ☐    |
| 붉은색      | `#ff3333` | 에러        | ☐    |
| 배경        | `#0d0d0d` | 배경        | ☐    |

### 7.2 스타일 금지 사항

- [ ] 외부 로고/상표 복제 금지
- [ ] CRT 테마와 충돌하는 색상 금지 (밝은 파스텔, 난색 남용)
- [ ] 복잡한 그라데이션/사진 스타일 금지

---

## 8. Retina 대응 (선택)

### 8.1 Retina 필요 여부 판단

| 상황             | Retina 필요 | 비고                  |
| ---------------- | ----------- | --------------------- |
| **16px 아이콘**  | 선택        | HiDPI에서 선명도 향상 |
| **24px+ 아이콘** | 낮음        | 기본 해상도로 충분    |
| **placeholder**  | 낮음        | 이미 충분한 해상도    |

### 8.2 Retina 파일 규칙

- 파일명: `{name}-24.png` → `{name}-24@2x.png`
- CSS: `image-set()`으로 1x/2x 제공
- manifest.json: `retina: true` 표기

---

## 9. 종합 체크리스트 (Quick Reference)

에셋 추가/수정 시 아래 항목을 순서대로 체크하세요:

### 📦 추가 전

- [ ] 네이밍 규칙 준수 (`kebab-case` + 용도 + 크기)
- [ ] 포맷 규칙 준수 (아이콘=PNG, placeholder=WebP)
- [ ] CRT 테마 색상과 조화

### 🎨 생성 시

- [ ] (조건부) 배경 제거 필요 시 순백(#FFFFFF) 배경으로 생성
- [ ] 필요 사이즈로 리사이즈
- [ ] (조건부) `rembg`로 배경 제거

### ✅ 추가 후

- [ ] 개별 용량 예산 준수 확인
- [ ] 총합 예산 준수 확인 (`totalBytes` < `budgetBytes`)
- [ ] 16px 실루엣 구분 가능 여부 (아이콘)
- [ ] 기본/Readable 모드 대비 확인
- [ ] (조건부) 알파 채널 존재 확인 (투명 필요 에셋)
- [ ] 폴백 텍스트/이모지 지정
- [ ] manifest.json 업데이트
- [ ] 실제 파일과 매니페스트 정합성 확인

---

## 10. 참고 자료

- **SSOT 규칙**: `frontend/public/ui/README.md`
- **배경 제거 가이드**: `vibe/ref/rembg-guide.md`
- **매니페스트 스키마**: `frontend/public/ui/manifest.schema.json`
- **스타일 가이드**: `vibe/ref/frontend-style-guide.md`
- **가독성 패스**: U-028[Mvp] (Readable 모드)

---

_마지막 업데이트: 2026-01-12_  
_문서 버전: 1.0.0_
