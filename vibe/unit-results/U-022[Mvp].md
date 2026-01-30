# U-022[Mvp]: Scanner 슬롯 UI + 업로드→아이템화 반영 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-022[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-31 16:30
- **담당**: AI Agent

---

## 1. 작업 요약

Scanner 슬롯(드랍존) UI를 구현하고, 이미지 업로드 시 백엔드 `/api/scan` 엔드포인트와 연동하여 분석 결과를 인벤토리에 반영하는 기능을 구현했습니다. 사용자가 분석된 후보 중 원하는 아이템을 선택하여 인벤토리에 추가하는 "확인 후 추가(Option B)" 정책을 적용했습니다.

---

## 2. 작업 범위

- **Scanner 슬롯 UI 구현**: 드래그 앤 드롭 및 파일 선택을 지원하는 고정 패널 UI (`ScannerSlot.tsx`)
- **업로드 및 분석 상태 관리**: `idle`, `uploading`, `analyzing`, `result`, `error` 상태별 UI 분기 및 시각적 피드백 제공
- **백엔드 API 연동**: `/api/scan` 호출 및 Zod를 이용한 응답 데이터(`ScannerResponse`) 검증 (`scanner.ts`)
- **아이템화 로직**: 분석된 `ItemCandidate`를 `InventoryItem`으로 변환하여 `inventoryStore`에 추가하는 연동 로직 구현
- **레이아웃 배치**: 오른쪽 사이드바(`sidebar-right`) 하단에 Scanner 패널 고정 배치 (`App.tsx`)

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `frontend/src/components/ScannerSlot.tsx` | 신규 | 드랍존/업로드 UI + 분석 결과 표시 + 아이템 추가 조작 |
| `frontend/src/components/ScannerSlot.test.tsx` | 신규 | ScannerSlot 컴포넌트 단위 테스트 |
| `frontend/src/api/scanner.ts` | 신규 | `/api/scan` 호출 클라이언트 및 응답 스키마/유틸리티 |
| `frontend/src/api/scanner.test.ts` | 신규 | Scanner API 클라이언트 단위 테스트 |
| `frontend/src/App.tsx` | 수정 | Scanner 슬롯 패널 배치 및 언어 상태 주입 |
| `frontend/src/stores/inventoryStore.ts` | 참조 | `addItems` 액션을 통해 업로드 결과 반영 (기존 구현 활용) |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약 (API 및 컴포넌트)**:

- `scanImage(file, language): Promise<ScanResult>` - 이미지 업로드 및 분석 요청
- `ScannerSlot({ language, disabled })` - 스캐너 통합 UI 컴포넌트
- `candidateToInventoryItem(candidate): InventoryItem` - 분석 후보를 인벤토리 데이터 규격으로 변환

**설계 패턴/원칙**:
- **상태 머신 패턴**: 업로드 라이프사이클을 명확한 상태(`ScannerState`)로 관리하여 UX 일관성 유지
- **Zod 기반 계약 검증**: 백엔드 응답을 런타임에 검증하여 프론트엔드 안정성 확보
- **Option B (User Confirmation)**: 분석 결과를 즉시 반영하지 않고 사용자가 선택하도록 하여 의도하지 않은 인벤토리 오염 방지

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `multipart/form-data`를 통한 이미지 전송, 로컬 `URL.createObjectURL`을 이용한 프리뷰 생성
- **권한/보안**: 파일 크기(20MB) 및 형식(JPEG/PNG/GIF/WebP) 클라이언트 측 선행 검증
- **빌드/의존성**: 신규 의존성 없음 (기존 `zod`, `react-i18next` 활용)

### 4.3 가정 및 제약사항

- 백엔드(U-021)가 `/api/scan` 엔드포인트에서 유효한 `ScannerResponse`를 반환한다고 가정
- MVP 단계에서는 업로드된 이미지의 영구 저장보다는 현재 세션 내 분석 및 아이템화에 집중

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-022-scanner-slot-ui-runbook.md`
- **실행 결과**: 런북에 정의된 5가지 시나리오(업로드, 아이템 선택, 에러 처리, 취소, 비활성화)에 대한 검증 완료 가이드 제공

---

## 6. 리스크 및 주의사항

- **네트워크 지연**: 이미지 업로드 및 비전 분석 특성상 지연이 발생할 수 있으므로 `analyzing` 상태의 시각적 피드백이 중요함
- **좌표 규약**: 백엔드에서 받은 `box_2d`는 0~1000 정규화 좌표를 유지하며, UI 표시 시에만 변환하여 사용 (RULE-009 준수)

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **RU-006**: 이미지/아티팩트 저장 및 보안 정책 수립
2. **CP-MVP-03**: 멀티모달(업로드) 조작을 포함한 통합 데모 시나리오 검증

### 7.2 의존 단계 확인

- **선행 단계**: U-021 (백엔드 엔드포인트), U-011 (인벤토리 기반) 완료 확인
- **후속 단계**: 로드맵의 마일스톤 3 (Multimodal & Vision) 통합 진행

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지 (ScannerSlot.tsx 등)
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._