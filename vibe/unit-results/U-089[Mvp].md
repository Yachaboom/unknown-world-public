# U-089[Mvp]: 핫픽스 - 정밀분석 실행 시 기존 이미지 유지 + 분석 전용 로딩 프로그레스 UX 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-089[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-07 10:15
- **담당**: AI Agent

---

## 1. 작업 요약

"정밀분석(Agentic Vision)" 실행 시 기존 Scene 이미지를 사라지게 하지 않고 반투명하게 유지한 상태에서, 별도의 분석 전용 로딩 오버레이(스캔라인 스윕 + 시안 글로우 UX)를 표시하도록 개선하여 "기존 장면을 분석 중"이라는 명확한 피드백을 제공합니다.

---

## 2. 작업 범위

- **상태 관리**: `worldStore.ts`에 `isAnalyzing` 플래그 및 `setIsAnalyzing` 액션 추가
- **트리거 감지**: `turnRunner.ts`에서 정밀분석 키워드/액션ID 감지 로직 구현 및 턴 수명 주기와 동기화
- **이미지 유지**: `SceneImage.tsx`에서 `isAnalyzing` 시 기존 이미지 숨김 방지 + 분석 오버레이 렌더
- **UX 구현**: `style.css`에 시안(Cyan) 테두리, 스캔라인 스윕 애니메이션, 텍스트 글로우 효과 추가
- **안정성**: 최소 표시 시간(500ms) 보장을 통한 깜빡임 방지 및 `prefers-reduced-motion` 대응

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `frontend/src/stores/worldStore.ts` | 수정 | `isAnalyzing` 상태 + `setIsAnalyzing` 액션 + 셀렉터 추가 |
| `frontend/src/turn/turnRunner.ts` | 수정 | 정밀분석 트리거 감지, `isAnalyzing` 토글, 최소 표시 시간(500ms) 적용 |
| `frontend/src/components/SceneCanvas.tsx` | 수정 | `isAnalyzing` 구독 및 `SceneImage`에 prop 전달 |
| `frontend/src/components/SceneImage.tsx` | 수정 | `isAnalyzing` 분기 로직(이미지 유지, 오버레이 표시) 구현 |
| `frontend/src/style.css` | 수정 | `.scene-analyzing` 오버레이, 스캔라인 스윕 애니메이션 스타일 |
| `frontend/src/turn/turnRunner.test.ts` | 수정 | 정밀분석 상태 토글 유닛 테스트 추가 |
| `frontend/src/components/SceneImage.test.tsx` | 수정 | 분석 오버레이 렌더링 검증 테스트 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 상태 및 메서드**:

- `isAnalyzing: boolean` - 정밀분석 실행 중 상태 (worldStore)
- `setIsAnalyzing(analyzing: boolean)` - 상태 변경 액션 (worldStore)
- `isVisionTrigger(actionId, text)` - 정밀분석 트리거 여부 판별 (turnRunner)
- `finishAnalyzing()` - 최소 시간 보장 후 분석 상태 해제 (turnRunner)

**UX 설계 패턴**:

- **Lazy Image 유지**: 정밀분석은 기존 이미지의 핫스팟만 추가하므로 이미지를 placeholder로 교체하지 않고 0.5 opacity + 시안 틴트로 유지.
- **분석 전용 오버레이**: 기존 `processingPhase` 로딩(U-071)과는 시각적으로 구분되는 시안(Cyan) 색상과 스캔라인 스윕 효과 적용.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 영향 없음 (UI 상태 관리만 수행)
- **권한/보안**: 영향 없음
- **빌드/의존성**: 영향 없음

### 4.3 가정 및 제약사항

- 정밀분석은 반드시 기존 Scene 이미지가 있을 때만 유의미하게 동작함 (이미지 없는 경우 일반 턴 처리).
- 분석 완료 시점은 서버의 `final` 이벤트 수신 시점과 동기화됨.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-089-analyzing-overlay-runbook.md` (신규 작성 권장)
- **실행 결과**: 정밀분석 트리거 시 기존 이미지 유지 및 오버레이 표시 확인됨
- **참조**: `U-076` 및 `U-071` 런북의 절차를 통합하여 검증 수행

---

## 6. 리스크 및 주의사항

- **애니메이션 과부하**: 스캔라인 스윕 효과가 저사양 기기에서 부담이 될 수 있으나 `prefers-reduced-motion` 대응을 통해 완화함.
- **상태 동기화**: 턴 완료(Complete) 또는 에러(Error) 시 반드시 `isAnalyzing`이 `false`로 리셋되도록 보장함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-090[Mvp]**: 정밀분석 결과 핫스팟의 등장 애니메이션과 분석 오버레이의 Fade-out 싱크 조정.
2. **CP-MVP-03**: "정밀분석 → 분석 UX → 핫스팟 등장" 전체 시나리오 데모 검증.

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항(기존 이미지 유지) 충족 확인
- [x] Repomix 최신 구조(stores, components) 반영 확인
- [x] CRT 테마(Cyan glow, Scanline) 디자인 가이드 준수
- [x] 최소 표시 시간 적용을 통한 UX 안정성 확보

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._