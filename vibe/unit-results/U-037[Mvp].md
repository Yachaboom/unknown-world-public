# U-037[Mvp]: CRT/가독성 레이어링(Readable 모드 제거, 중요 영역 보호) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-037[Mvp]
- **단계 번호**: 2.3 (M2 마일스톤)
- **작성 일시**: 2026-01-14 00:15
- **담당**: AI Agent

---

## 1. 작업 요약

별도의 Readable 모드 토글을 제거하고, UI를 '식별성이 중요한 영역(critical)'과 '분위기/장식 영역(ambient)'으로 구분하는 계층형 스타일 정책을 도입했습니다. 이를 통해 CRT 레트로 미학을 유지하면서도 게임 핵심 정보(재화, 비용, 상태 배지 등)의 가독성을 비약적으로 향상시켰습니다.

---

## 2. 작업 범위

- [x] **Readable 모드 제거**: `uiPrefsStore` 상태, 액션, UI 버튼 및 `data-readable` DOM 속성 제거
- [x] **중요도 기반 레이어링 도입**: `critical` 영역 보호(z-index 상향, 텍스트 섀도우 강화) 및 `ambient` 영역 분위기 집중
- [x] **Scene Canvas 중심 CRT 효과**: 전역 오버레이 강도를 낮추고(0.3) 씬 캔버스에 스캔라인 효과를 집중 적용
- [x] **접근성 가드 추가**: `prefers-reduced-motion` 대응으로 광과민/피로 유발 요소 자동 완화
- [x] **데이터 마이그레이션**: legacy localStorage 내 `readableMode` 값 처리 로직 구현 (Version 1)
- [x] **테스트 환경 구축**: `jsdom` 기반 컴포넌트 테스트 환경 설정 및 `AgentConsole` 중요도 속성 검증

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/style.css` | 수정 | 중요도 기반 CSS 토큰 및 레이어링 정책 구현 |
| `frontend/src/stores/uiPrefsStore.ts` | 수정 | Readable 상태 제거 및 마이그레이션 로직 추가 |
| `frontend/src/App.tsx` | 수정 | UI 컨트롤 정리 및 가독성 정책 연동 |
| `frontend/src/components/AgentConsole.tsx` | 수정 | `critical` 중요도 마킹 적용 |
| `frontend/src/components/AgentConsole.test.tsx` | 신규 | 컴포넌트 중요도 속성 검증 테스트 |
| `frontend/src/setupTests.ts` | 신규 | Vitest + jest-dom 환경 설정 |
| `frontend/vite.config.ts` | 수정 | `jsdom` 테스트 환경 활성화 |
| `frontend/index.html` | 수정 | 가독성 향상을 위한 `Share Tech Mono` 폰트 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**중요도 레이어링 정책**:
- `critical` (z-index: 10000): CRT 오버레이(9999) 위로 텍스트를 띄워 선명하게 노출. `text-shadow`를 통해 배경과의 대비 극대화.
- `ambient` (z-index: 1): CRT 오버레이 아래에 위치하여 레트로 감성(스캔라인, 지글거림)을 온전히 수용.

**접근성 가드 (Reduced Motion)**:
```css
@media (prefers-reduced-motion: reduce) {
  .crt-overlay { animation: none; opacity: 0.15; }
  .glitch::before, .glitch::after { animation: none; opacity: 0; }
}
```

### 4.2 외부 영향 분석

- **사용자 경험**: "모드 토글"의 번거로움 없이도 항상 중요한 정보가 잘 보이며, 게임 분위기는 씬 캔버스를 통해 충분히 전달됨.
- **데이터 모델**: `uiPrefsStore`의 스토리지 버전이 `1`로 상향됨.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-037-crt-layering-runbook.md`
- **실행 결과**: 수동 검증 시나리오(A~E)를 통해 마이그레이션 및 가독성 레이어링 정상 동작 확인 완료.

---

## 6. 리스크 및 주의사항

- **중요도 마킹 누락**: 향후 추가되는 중요 정보 컴포넌트에도 반드시 `data-ui-importance="critical"` 속성을 적용해야 함.
- **폰트 로딩**: `Share Tech Mono` 폰트가 Google Fonts로부터 정상 로드되지 않을 경우의 대비책(Consolas 등) 마련됨.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-038(아이콘 v2)**: 재생성된 아이콘들에 `critical` 레이어링 적용
2. **U-032(Chrome)**: 장식적 요소들에 `ambient` 레이어링 적용 확인

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파쇄적 변경(Readable 제거)에 대한 마이그레이션 대응 완료

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._