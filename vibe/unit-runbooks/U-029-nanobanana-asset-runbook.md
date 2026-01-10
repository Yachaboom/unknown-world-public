# U-029[Mvp] nanobanana mcp 에셋 패스 실행 가이드

## 1. 개요

UI에서 텍스트/이모지로 표현되던 요소들(Signal, Shard, Risk, Badge 등)을 **nanobanana mcp**로 제작한 이미지 에셋으로 반영했습니다. 폴백 패턴이 적용되어 이미지 로드 실패 시에도 이모지가 표시됩니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-030[Mvp] (에셋 SSOT), U-028[Mvp] (UI 가독성), U-008[Mvp] (Agent Console)
- 선행 완료 필요: 없음 (독립 실행 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 개발 서버 실행

```bash
pnpm dev --port 8001
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 성공 지표:
  - "UNKNOWN WORLD" 헤더가 표시됨
  - Economy HUD에 Signal/Shard 영역이 보임
  - Action Deck에 3개 카드가 표시됨

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 에셋 파일 확인

**목적**: 생성된 에셋 파일들이 올바른 위치에 있는지 확인

**실행**:

```bash
ls -la frontend/public/ui/icons/
```

**기대 결과**:

```
badge-fail-24.png
badge-ok-16.png
badge-ok-24.png
risk-medium-16.png
shard-24.png
signal-16.png
signal-24.png
status-online-16.png
```

**확인 포인트**:
- ✅ 최소 6개 이상의 에셋 파일 존재
- ✅ kebab-case 네이밍 규칙 준수
- ✅ PNG 포맷

---

### 시나리오 B: Economy HUD 아이콘 확인

**목적**: Signal/Shard 아이콘이 Economy HUD에 적용되었는지 확인

**실행**:
1. 브라우저에서 `http://localhost:8001` 접속
2. 화면 상단 우측 Economy HUD 영역 확인

**기대 결과**:
- Signal 아이콘 영역에 이미지 또는 ⚡ 이모지 표시
- Shard 아이콘 영역에 이미지 또는 💎 이모지 표시
- "Signal: 100", "Shard: 5" 텍스트 표시

**확인 포인트**:
- ✅ Economy HUD가 헤더에 표시됨
- ✅ 아이콘 영역이 존재함 (이미지 또는 이모지)
- ✅ 재화 수치가 정상 표시됨

---

### 시나리오 C: Action Deck 아이콘 확인

**목적**: Action Deck 카드에 Signal/Risk 아이콘이 적용되었는지 확인

**실행**:
1. 브라우저에서 화면 하단 Action Deck 영역 확인
2. 카드의 비용/위험 표시 확인

**기대 결과**:
- 각 카드에 Signal 비용 표시 (예: "1", "2")
- 각 카드에 Risk 레벨 표시 (예: "low", "medium")
- 아이콘 영역에 이미지 또는 ⚡/⚠ 이모지 표시

**확인 포인트**:
- ✅ 3개 기본 카드 표시
- ✅ 비용/위험 영역에 아이콘 래퍼 존재
- ✅ 이모지 폴백 동작 (이미지 로드 실패 시)

---

### 시나리오 D: 폴백 동작 확인

**목적**: 이미지 로드 실패 시 이모지 폴백이 동작하는지 확인

**실행**:
1. 개발자 도구(F12) 열기
2. Network 탭에서 이미지 요청 차단 또는
3. 아이콘 파일을 임시로 삭제/이동

```bash
# 임시로 아이콘 이동
mv frontend/public/ui/icons/signal-24.png frontend/public/ui/icons/signal-24.png.bak
```

4. 페이지 새로고침

**기대 결과**:
- Signal 아이콘 위치에 ⚡ 이모지가 표시됨
- UI가 깨지지 않고 정상 동작

**복원**:

```bash
mv frontend/public/ui/icons/signal-24.png.bak frontend/public/ui/icons/signal-24.png
```

**확인 포인트**:
- ✅ 이미지 로드 실패 시 이모지 표시
- ✅ UI 레이아웃 유지
- ✅ 기능 정상 동작

---

### 시나리오 E: manifest.json 확인

**목적**: 에셋 매니페스트가 올바르게 업데이트되었는지 확인

**실행**:

```bash
cat frontend/public/ui/manifest.json | head -30
```

**기대 결과**:

```json
{
  "$schema": "./manifest.schema.json",
  "version": "1.0.0",
  "assets": [
    {
      "id": "signal-24",
      "path": "icons/signal-24.png",
      ...
    }
  ]
}
```

**확인 포인트**:
- ✅ 8개 에셋 항목 존재
- ✅ 각 에셋에 fallback 정의
- ✅ usedIn 필드에 사용처 명시

---

## 4. 실행 결과 확인

### 4.1 생성 파일

| 파일 경로 | 목적 |
| --- | --- |
| `frontend/public/ui/icons/signal-24.png` | Signal 아이콘 (24px) |
| `frontend/public/ui/icons/signal-16.png` | Signal 아이콘 (16px) |
| `frontend/public/ui/icons/shard-24.png` | Memory Shard 아이콘 |
| `frontend/public/ui/icons/badge-ok-24.png` | OK 배지 아이콘 |
| `frontend/public/ui/icons/badge-ok-16.png` | OK 배지 아이콘 (16px) |
| `frontend/public/ui/icons/badge-fail-24.png` | Fail 배지 아이콘 |
| `frontend/public/ui/icons/risk-medium-16.png` | Risk 경고 아이콘 |
| `frontend/public/ui/icons/status-online-16.png` | 온라인 상태 아이콘 |

### 4.2 성능 지표

- 아이콘 파일 크기: 약 300-400KB (최적화 필요)
- 총 에셋 크기: 약 2.8MB (예산 1.5MB 초과, 후속 최적화 권장)

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 6개 이상의 에셋 파일 생성됨
- ✅ Economy HUD, Action Deck에 아이콘 적용됨
- ✅ 이모지 폴백 동작 확인됨
- ✅ manifest.json 업데이트됨

**실패 시 확인**:
- ❌ 아이콘이 안 보임 → 파일 경로 확인 (`/ui/icons/...`)
- ❌ 이모지도 안 보임 → CSS 클래스 확인 (`.icon-wrapper`, `.icon-fallback`)
- ❌ 개발 서버 오류 → `pnpm install` 재실행

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 아이콘이 흰 박스로 표시됨

- **원인**: 흰 배경 이미지가 검정 CRT 배경에서 잘 안 보임
- **해결**: CSS `mix-blend-mode` 조정 또는 이모지 폴백 사용

**오류**: 이미지 파일을 찾을 수 없음

- **원인**: 파일 경로 오류
- **해결**: `/ui/icons/` 경로가 올바른지 확인

### 5.2 rembg 모델 선택

- **사용된 모델**: `birefnet-general` (제품/오브젝트용)
- `isnet-anime`는 캐릭터/일러스트용이므로 UI 아이콘에는 부적합
- 자세한 모델 선택 규칙: `vibe/ref/rembg-guide.md` 참조

### 5.3 후속 최적화 권장

- 이미지 크기 최적화 (TinyPNG 등)
- 24px 실제 해상도로 리사이즈
- 투명 배경 아이콘 개선 (프롬프트 조정 - 앱 아이콘 형태 금지)

---

## 6. 다음 단계

- **U-031**: 상태 Placeholder Pack 구축
- **U-033**: 에셋 매니페스트 자동화 및 QA 스크립트
- 이미지 최적화 (성능 예산 준수)

---

_마지막 업데이트: 2026-01-11_
