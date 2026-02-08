# U-086[Mvp] 턴 진행 피드백 보강 - 텍스트 우선 타이핑 출력 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-086[Mvp]
- **단계 번호**: 2.5 (턴 진행 피드백)
- **작성 일시**: 2026-02-08 23:30
- **담당**: AI Agent

---

## 1. 작업 요약

이미지 생성 지연(10~15초) 동안 사용자가 시스템 멈춤으로 느끼지 않도록, 텍스트 생성이 완료되면 즉시 타이핑 출력을 시작하고 느린 타이핑 모드로 지연을 흡수하는 **Text-first Delivery UX**를 구현했습니다.

---

## 2. 작업 범위

- **텍스트 우선 출력 (Text-first)**: 이미지 생성이 완료될 때까지 대기하지 않고 텍스트 결과 수신 즉시 NarrativeFeed 타이핑 시작.
- **동적 타이핑 속도 제어**: 이미지 생성 중(`isImageLoading`)인 경우 느린 모드(~12초), 완료/없음 시 빠른 모드(~2.5초)로 출력 속도 자동 전환.
- **이미지 Pending 상태 라인**: 타이핑이 끝난 후에도 이미지가 도착하지 않은 경우 "이미지 형성 중…▌" 시스템 메시지 노출.
- **접근성(a11y)**: `prefers-reduced-motion` 환경에서 타이핑 효과 및 커서 깜빡임 애니메이션 비활성화.
- **다국어(i18n)**: 한국어/영어 로케일에 따른 상태 라벨 키 적용.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `frontend/src/App.tsx` | 수정 | NarrativeFeed에 `isStreaming`/`isImageLoading` prop 전달 |
| `frontend/src/components/NarrativeFeed.tsx` | 수정 | 동적 타이핑 속도 계산 로직 및 이미지 pending 상태 라인 렌더링 |
| `frontend/src/style.css` | 수정 | `.image-pending-line`, `.image-pending-cursor` 스타일 및 애니메이션 추가 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | `narrative.image_pending_label` ("이미지 형성 중…") 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | `narrative.image_pending_label` ("Forming image…") 추가 |
| `frontend/src/turn/turnRunner.ts` | 수정 | 텍스트 생성 완료 시점에 UI 갱신을 먼저 수행하여 타이핑 즉시 트리거 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**동적 타이핑 엔진 (NarrativeFeed.tsx)**:
- `TARGET_DURATION_MS`: `isImageLoading` 상태에 따라 12000ms(느림) 또는 2500ms(빠름) 목표 시간 설정.
- `targetCPS`: 남은 텍스트 길이와 남은 시간을 계산하여 매 틱(`32ms`)마다 가변적인 글자수 출력.
- **Late-binding Support**: 타이핑 도중 이미지가 도착하면 즉시 빠른 모드로 전환되어 매끄러운 UX 제공.

**상태 라인 (Pending UI)**:
- 타이핑이 완료되었으나 `isImageLoading`이 여전히 `true`인 경우에만 `image-pending-line` 노출.
- 커서(▌)에 `blink 1s infinite` 애니메이션을 적용하여 시스템이 여전히 작동 중임을 명시.

### 4.2 외부 영향 분석

- **UX/성능**: 텍스트 TTFB(Time To First Byte) 이후 즉시 피드백이 발생하므로 체감 대기 시간이 대폭 감소함.
- **가시성**: Agent Console의 `image_pending` 배지와 NarrativeFeed의 텍스트 출력이 동기화되어 오케스트레이션 과정을 더 명확히 인지 가능.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-086-text-first-typing-runbook.md`
- **실행 결과**: 런북의 시나리오 A(빠른 타이핑), B(느린 타이핑+Pending), C(속도 전환) 전수 검증 통과.

---

## 6. 리스크 및 주의사항

- **타이핑 피로도**: 12초 동안의 느린 타이핑이 답답할 수 있으므로 클릭/Enter를 통한 Fast-forward 기능이 항상 작동함을 확인해야 함.
- **이미지 도착 시점**: 매우 짧은 텍스트의 경우 이미지가 도착하기 전에 타이핑이 끝나 "이미지 형성 중..." 라인이 잠깐 나타났다 사라질 수 있음 (의도된 동작).

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-087[Mvp]**: 대기열 진행 중 사용자 입력 잠금 (허위 액션 로그 방지)
2. **CP-MVP-03**: 10분 데모 루프 통합 검증

### 7.2 의존 단계 확인

- **선행 단계**: U-066(타이핑 기본), U-071(처리 단계)
- **후속 단계**: U-087, U-084

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] 텍스트 우선 출력 흐름 (이미지 완료 대기 제거) 확인
- [x] 동적 타이핑 속도 전환 (느림/빠름) 확인
- [x] i18n 및 접근성 가이드 준수 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
