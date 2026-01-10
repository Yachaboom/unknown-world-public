# U-031[Mvp]: nanobanana mcp 상태 Placeholder Pack(Scene/오프라인/에러/차단)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-031[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-030,U-004 |
| 우선순위  | Medium      |

## 작업 목표

Scene Canvas와 주요 시스템 상태(로딩/오프라인/차단/저신호 등)에 대해, 텍스트만 있는 빈 화면 대신 **게임스러운 상태 이미지(placeholder)** 를 `nanobanana mcp`로 제작하고 UI에 반영한다.

**배경**: 데모에서 “이미지 생성이 아직 없거나 실패한 상황”이 자주 발생한다. 이때 상태 화면이 허전하면 제품이 덜 완성돼 보이고, 사용자에게 실패로 인식된다. placeholder는 **실패/지연을 UX로 흡수**하는 핵심 장치다. (PRD: Lazy image loading/폴백)

**완료 기준**:

- 최소 4종 이상의 상태 placeholder(예: `loading`, `offline`, `blocked`, `low-signal`)를 일관된 CRT 톤으로 제작한다.
- Scene Canvas에 상태별 placeholder가 적용되며, 로딩 실패 시에도 텍스트 폴백이 유지된다.
- 파일 크기/네이밍/저장 위치는 U-030(에셋 SSOT)을 준수한다.

## 영향받는 파일

**생성**:

- `frontend/public/ui/placeholders/scene-loading-*.png` - 로딩 placeholder
- `frontend/public/ui/placeholders/scene-offline-*.png` - 오프라인 placeholder
- `frontend/public/ui/placeholders/scene-blocked-*.png` - 안전/정책 차단 placeholder
- `frontend/public/ui/placeholders/scene-low-signal-*.png` - 재화/신호 부족 placeholder

**수정**:

- `frontend/src/App.tsx` - Scene Canvas placeholder 렌더 분기(상태 → 이미지/텍스트 폴백)
- `frontend/src/style.css` - placeholder 적용 CSS(배경 이미지/크기/대비/Readable 모드 연동)
- (선택) `frontend/src/stores/agentStore.ts` - 스트림 에러/차단 상태를 UI가 소비할 수 있게 노출(필요 시)

**참조**:

- `vibe/unit-plans/U-030[Mvp].md` - 에셋 SSOT(경로/네이밍/예산/폴백)
- `vibe/unit-plans/U-028[Mvp].md` - Readable 모드/스케일(placeholder 대비/텍스트 가독성)
- `vibe/prd.md` 6.3/10.2 - 텍스트 우선 + Lazy loading + 실패 폴백

## 구현 흐름

### 1단계: 상태 정의(최소 4종) 및 UI 연결 방식 확정

- 상태 키를 단순화한다: `loading | offline | blocked | low_signal`
- MVP에서는 Scene Canvas 내부 placeholder만 먼저 적용하고, 다른 패널로 확장은 후속 유닛에서 한다.

### 2단계: nanobanana mcp로 placeholder 에셋 제작

- 공통 아트 디렉션: CRT 인광 그린 톤 + 스캔라인 느낌 + “게임 화면” 인상(단, 과도한 텍스트 렌더링은 피함)
- 1x/2x(또는 512/1024) 2종을 우선 제작해 작은/큰 화면 모두 대응한다.

### 3단계: UI 반영 + 폴백 유지

- 이미지가 없거나 로딩 실패 시: 기존 텍스트(`Scene Canvas`, 설명 문구)를 유지한다.
- Readable 모드에서는 placeholder의 대비/오버레이 강도를 약하게(가독성 우선) 한다.

### 4단계: 성능/예산 체크

- placeholder별 용량 상한을 확인하고(권장 200KB 이하), 필요 시 압축/리사이즈한다.
- 총 에셋 예산을 넘지 않도록 최소 개수만 유지한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-030[Mvp]](U-030[Mvp].md) - 에셋 SSOT
- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - Scene Canvas/UI 골격

**다음 작업에 전달할 것**:

- U-019/U-020(이미지 생성/렌더)에서 “이미지 생성 전/실패 시” 화면 품질 기준선
- 데모/리플레이에서 안정적으로 보여줄 “상태 표현 패턴(이미지+텍스트 폴백)”

## 주의사항

**기술적 고려사항**:

- placeholder에 긴 문장을 이미지로 박지 않는다(언어/접근성/번역/리사이즈 문제). 핵심 라벨은 텍스트 UI로 유지한다.
- “차단(blocked)” 표현은 공포/선정적 표현 대신, 제품/정책 안내 수준으로 표현한다.

**잠재적 리스크**:

- placeholder가 너무 화려하면 정보 전달을 방해 → Readable 모드/대비 토큰으로 완화 가능하게 설계한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: placeholder의 텍스트(예: OFFLINE) 일부를 이미지에 포함할까?
  - Option A: 이미지에는 최소 상징만 포함, 텍스트는 UI로 렌더 ✅
  - Option B: 이미지에 짧은 라벨 포함(브랜드감 ↑) — 대신 i18n/가독성 리스크

## 참고 자료

- `vibe/prd.md` - Lazy loading/실패 폴백, 데모 표면 UX
- `vibe/unit-plans/U-030[Mvp].md` - 에셋 SSOT 규칙
- `vibe/unit-plans/U-028[Mvp].md` - 가독성/Readable 모드

