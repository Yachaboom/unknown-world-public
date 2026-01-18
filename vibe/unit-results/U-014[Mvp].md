# U-014[Mvp]: Economy HUD + Ledger(프론트) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-014[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-18 19:45
- **담당**: AI Agent

---

## 1. 작업 요약

Signal/Memory Shard 재화 HUD를 구현하고, 턴별 비용/잔액 변화를 원장(ledger)으로 추적하는 시스템을 구축했습니다. 비용/지연을 게임 메커닉으로 반영하기 위해 예상 비용 표시 및 잔액 부족 가드 로직을 프론트엔드에 통합했습니다.

---

## 2. 작업 범위

- **Economy Store 구현**: Zustand 기반의 독립적인 경제 상태 관리 스토어 구축 (ledger, cost estimate, last cost 추적)
- **Economy HUD 컴포넌트**: 재화 잔액 및 비용 정보를 시각화하는 게임 HUD 컴포넌트 구현
- **Action Deck 연동**: 각 카드의 비용 표시 및 잔액 기반 실행 가능 여부 가드 로직 적용
- **레이아웃 통합**: 메인 레이아웃(Sidebar Right) 및 헤더에 경제 정보 가시화
- **스타일링**: CRT 테마에 맞춘 재화 아이콘 및 경고 스타일링 (U-037 중요도 레이어링 적용)

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `frontend/src/stores/economyStore.ts` | 신규 | 재화/원장 상태 관리 및 비즈니스 로직 (Q1: Option A 적용) |
| `frontend/src/components/EconomyHud.tsx` | 신규 | 재화 잔액, 예상 비용, 확정 비용 표시 UI |
| `frontend/src/App.tsx` | 수정 | 사이드바에 EconomyHud 배치 및 턴 결과 반영 연동 |
| `frontend/src/components/ActionDeck.tsx` | 수정 | 카드 비용 표시 및 잔액 부족 시 비활성화 로직 연동 |
| `frontend/src/style.css` | 수정 | Economy HUD 및 재화 아이콘, 경고 애니메이션 스타일 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:
- `economyStore.addLedgerEntry(entry)`: 턴 완료 시 확정된 비용과 잔액을 원장에 기록 (최대 20개 보관)
- `economyStore.setCostEstimate(min, max)`: 액션 선택 시 예상 비용 상태 갱신
- `canAfford(balance, cost)`: 현재 잔액으로 특정 비용을 지불 가능한지 판단하는 순수 함수

**설계 패턴/원칙**:
- **RULE-005 (Economy Invariant)**: 잔액 음수 진행 방지 및 사전 예상 비용 노출
- **Q1: Option A**: 메모리 효율성을 위해 최근 20턴의 원장만 보관
- **Critical Layering (U-037)**: 재화 정보는 CRT 오버레이 위로 뚫고 나오는 `critical` 중요도 적용

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `localStorage`에 원장 데이터가 지속되지 않음 (현재 세션 전용, 향후 U-015에서 SaveGame 통합 예정)
- **UI/UX**: 사용자는 행동을 확정하기 전에 소모될 재화를 미리 알 수 있으며, 부족할 경우 대체 행동(Alternative)을 선택하도록 유도됨

### 4.3 가정 및 제약사항

- 서버의 경제 Hard Gate(U-018)가 구현되기 전이므로, 현재는 클라이언트 측의 "표시 및 입력 가드" 역할에 집중함
- 원장 데이터는 현재 메모리에만 유지됨

---

## 5. 런북(Runbook) 정보

- **파일 경로**: N/A (분석 기반 작성)
- **실행 결과**: `ActionDeck` 카드 호버 시 예상 비용이 `EconomyHud`에 반영되며, 턴 완료 후 `lastCost`가 업데이트됨을 확인

---

## 6. 리스크 및 주의사항

- **서버-클라 정합성**: 서버의 실제 차단 로직이 구현되지 않은 상태이므로 클라이언트 가드를 우회하는 요청이 발생할 수 있음 (U-018에서 해결 예정)
- **영문 마이크로 텍스트**: 숫자 가독성을 위해 영문 전용 폰트(`Share Tech Mono`)가 적용되었으므로 폰트 로딩 실패 시 레이아웃 깨짐 확인 필요

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-015[Mvp]**: SaveGame 통합 시 economy ledger 및 잔액 포함
2. **U-018[Mvp]**: 서버 측 경제 Hard Gate 및 Repair loop 연동

### 7.2 의존 단계 확인

- **선행 단계**: U-008(스트리밍), U-009(액션덱) 완료 확인
- **후속 단계**: U-015(세이브/리셋)

---

## 8. 자체 점검 결과

- [x] RULE-005 경제 인바리언트 준수 (예상 비용 노출)
- [x] Q1: Option A (최근 N턴 보관) 적용 완료
- [x] U-037 가독성 레이어링(Critical) 적용 확인
- [x] i18n 언어 키 적용 완료

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
