# U-029[Mvp]: nanobanana mcp 에셋 패스(UI 아이콘/프레임/placeholder) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-029[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-11 16:20
- **담당**: AI Agent

---

## 1. 작업 요약

UI의 시각적 완성도와 "게임 GM 시스템"의 몰입감을 높이기 위해 `nanobanana mcp`를 사용하여 주요 UI 아이콘 및 플레이스홀더 에셋을 제작하고 반영했습니다. `rembg`를 통한 투명 배경 확보와 이모지 폴백 로직을 통해 견고한 UI 에셋 파이프라인을 구축했습니다.

---

## 2. 작업 범위

- **에셋 제작**: Signal, Shard, Risk(Low/Med/High), Badge(OK/Fail), Status 등 총 12종의 아이콘 제작
- **플레이스홀더 제작**: Scene Canvas용 레트로 터미널 스타일 플레이스홀더 제작
- **배경 제거 및 최적화**: `rembg`를 활용한 투명 PNG 생성 및 용량 최적화 (예산 내 관리)
- **UI 통합**: Economy HUD, Action Deck, Agent Console 등에 아이콘 적용 및 CSS 폴백 로직 구현
- **매니페스트 관리**: `manifest.json`을 통한 에셋 SSOT 관리 및 메타데이터 기록

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/public/ui/icons/*.png` | 신규 | UI 아이콘 에셋 (Signal, Shard, Risk 등) |
| `frontend/public/ui/placeholders/*.png` | 신규 | Scene Canvas 플레이스홀더 에셋 |
| `frontend/public/ui/manifest.json` | 수정 | 에셋 매니페스트 등록 및 메타데이터 업데이트 |
| `frontend/src/style.css` | 수정 | 아이콘 래퍼 및 폴백 스타일 추가 |
| `frontend/src/components/EconomyHUD.tsx` | 수정 | 재화 아이콘 적용 |
| `frontend/src/components/ActionCard.tsx` | 수정 | 비용/위험 아이콘 적용 |
| `vibe/unit-runbooks/U-029-nanobanana-asset-runbook.md` | 신규 | 유닛 실행 및 검증 런북 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**에셋 파이프라인 (Gen-Edit-Deploy)**:
1. **Generation**: `nanobanana mcp`에 `STYLE HEADER v1` 템플릿과 순백(#FFFFFF) 배경 제약을 적용하여 일관된 스타일의 원본 생성
2. **Editing**: `rembg` (birefnet-general 모델)를 사용하여 배경을 정밀하게 제거하고 투명 PNG 확보
3. **Optimization**: 픽셀 정렬 및 용량 최적화를 통해 1KB 미만의 고효율 아이콘 생성
4. **Integration**: `manifest.json`에 경로와 폴백(이모지)을 정의하고 CSS에서 선언적으로 사용

**폴백 시스템 (Graceful Degradation)**:
- 이미 로드 실패 시 `.icon-fallback` 요소(이모지/텍스트)가 즉시 표시되도록 CSS 선택자 구조 설계
- `U-030`에서 정의한 SSOT 규칙에 따라 아이콘이 없어도 UI 기능이 유지됨

### 4.2 외부 영향 분석

- **번들 크기**: 총 에셋 크기 약 267KB로 성능 예산(1.5MB) 이내에서 안정적으로 관리됨
- **가독성**: `U-028`의 Readable 모드와 연동되어 CRT 효과 활성화 여부에 따라 아이콘 시인성이 최적화됨

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-029-nanobanana-asset-runbook.md`
- **실행 결과**: 아이콘 렌더링, 폴백 동작, 매니페스트 정합성 등 5개 시나리오 검증 완료

---

## 6. 리스크 및 주의사항

- **스타일 일관성**: 향후 에셋 추가 시 `vibe/ref/nanobanana-mcp.md`의 프롬프트 템플릿을 엄격히 준수해야 함
- **캐싱**: 에셋 변경 시 `manifest.json`의 버전업 또는 파일명 해시 처리가 필요할 수 있음 (현재는 정적 경로 사용)

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. `U-031[Mvp]`: 상태 Placeholder Pack 확장 (Scene/오프라인/에러)
2. `U-033[Mvp]`: 에셋 매니페스트 자동화 및 QA 스크립트 고도화

### 7.2 의존 단계 확인

- **선행 단계**: U-030[Mvp], U-028[Mvp], U-034[Mvp] 완료
- **후속 단계**: U-031[Mvp], U-032[Mvp]

---

## 8. 자체 점검 결과

- [x] 6개 이상의 에셋 제작 및 반영 완료
- [x] rembg를 통한 투명 배경 확보 완료
- [x] 이모지 폴백 로직 동작 확인
- [x] manifest.json SSOT 동기화 완료
- [x] 가독성 가이드(U-028) 준수

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
