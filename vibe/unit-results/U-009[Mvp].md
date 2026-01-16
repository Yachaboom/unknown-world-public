# U-009[Mvp]: Action Deck(카드+비용/대안) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-009[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-17 14:40
- **담당**: AI Agent

---

## 1. 작업 요약

턴 결과(TurnOutput)로부터 Action Deck(3~6장 카드)을 렌더링하고, 카드 클릭으로 다음 턴 실행을 연동하는 "게임 카드" UI 시스템을 구현하였습니다. PRD 요구사항에 따라 비용, 위험도, 보상 힌트를 명시하고 잔액 부족 시 대안 카드를 노출하는 로직을 포함합니다.

---

## 2. 작업 범위

- **Action Deck 컴포넌트 구현**: Footer 영역 고정 레이아웃 내 3~6장 카드 렌더링
- **비용/위험도 시각화**: 아이콘과 텍스트를 결합한 비용 추정치 및 위험 레벨 표시
- **상태 관리 통합**: Zustand(`actionDeckStore`)를 통한 카드 목록 및 선택 상태 관리
- **턴 실행 연동**: 카드 클릭 시 `action_id`를 포함한 턴 실행 API(`startTurnStream`) 호출 연결
- **대안 카드 지원**: `is_alternative` 플래그 기반의 대안 행동 시각화 및 자동 배치
- **검증 테스트**: 컴포넌트 및 스토어에 대한 단위 테스트 100% 통과

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `frontend/src/components/ActionDeck.tsx` | 신규 | Action Deck 및 Card UI 컴포넌트 |
| `frontend/src/components/ActionDeck.test.tsx` | 신규 | Action Deck 컴포넌트 단위 테스트 |
| `frontend/src/stores/actionDeckStore.ts` | 신규 | Action Deck 상태 관리 스토어 |
| `frontend/src/stores/actionDeckStore.test.ts` | 신규 | Action Deck 스토어 단위 테스트 |
| `frontend/src/App.tsx` | 수정 | Action Deck 배치 및 턴 실행 로직 연동 |
| `frontend/src/style.css` | 수정 | 카드 레이아웃, 호버 효과, 위험도별 보더 스타일 적용 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:
- `ActionDeck(props: { cards, onCardClick, currentBalance, disabled })`: 메인 카드 덱 컨테이너
- `useActionDeckStore`: `cards`, `selectedCardId` 관리 및 `setCards` 액션 제공
- `executeTurn(text, actionId)`: `App.tsx` 내에서 카드를 통한 턴 실행 트리거

**설계 패턴/원칙**:
- **Option A (서버 우선 검증)**: 서버가 제공하는 `enabled` 상태를 최우선으로 하되, 클라이언트 잔액(`currentBalance`)과 비교하여 실시간 실행 가능 여부를 이중 확인합니다.
- **Chrome Decoration**: `has-chrome` 클래스를 적용하여 단순 버튼이 아닌 장식된 게임 카드 스타일을 유지합니다. (RULE-002 준수)
- **Importance-driven Styling**: 비용 정보에 `data-ui-importance="critical"`을 부여하여 가독성을 보장합니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `TurnOutput` 스키마의 `ui.action_deck` 데이터를 소비합니다.
- **UI/UX**: Footer 영역에 고정된 덱이 상시 노출되며, 스트리밍 중에는 전체 카드가 비활성화됩니다.
- **i18n**: 카드 라벨, 위험도 이름, 비활성 사유 등을 다국어로 지원합니다.

### 4.3 가정 및 제약사항

- 카드는 최소 3장에서 최대 6장 사이로 유지됨을 가정합니다.
- 비용은 Signal과 Memory Shard 두 종류의 재화만을 고려합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: (별도 런북 없음, 구현 계획서 준수)
- **실행 결과**: `ActionDeck.test.tsx`를 통해 렌더링 및 비활성화 로직 검증 완료. 브라우저 수동 확인을 통해 8001 포트에서 레이아웃 정합성 확인.

---

## 6. 리스크 및 주의사항

- **가독성**: 많은 정보(라벨, 설명, 비용, 힌트)가 카드 한 장에 모여 있으므로 UI 스케일 변경 시 레이아웃 깨짐 주의 필요.
- **동기화**: 서버의 `enabled` 판단과 클라이언트의 잔액 계산 로직이 일치해야 함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. `U-010[Mvp]`: Scene Canvas + Hotspot Overlay 구현 (클릭 조작 확장)
2. `U-014[Mvp]`: Economy HUD 고도화 (잔액-비용 연동 강화)

### 7.2 의존 단계 확인

- **선행 단계**: U-004[Mvp], U-008[Mvp] (완료)
- **후속 단계**: CP-MVP-02 (체크포인트: 클릭+드래그 데모)

---

## 8. 자체 점검 결과

- [x] PRD 6.7 Action Deck 요구사항 충족 확인
- [x] RULE-002 채팅 UI 탈피 준수 확인
- [x] RULE-005 비용 사전 노출 및 대안 제공 로직 포함
- [x] Repomix 최신 구조 반영 확인
- [x] 유닛 테스트(Vitest) 통과 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
