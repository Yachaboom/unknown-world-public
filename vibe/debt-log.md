## [2026-01-12] 이슈: Chrome 에셋(scanner-frame) 용량 최적화 필요

- **발견 위치**: `frontend/public/ui/chrome/scanner-frame.png`
- **현상**: 파일 크기가 약 100KB로, 초기 Chrome 에셋 예산(50KB)을 초과함. (현재 예산을 120KB로 임시 상향 조정하여 대응)
- **추정 원인**: 346x200 해상도의 고품질 텍스처 및 투명도가 포함된 PNG 포맷 특성상 용량이 큼.
- **보류 사유**: U-033[Mvp]의 목표는 "QA 프로세스 도입"이며, 당장 이미지 품질을 저하시키지 않고 예산을 조정하는 것으로 합의함. 추후 MMP 단계에서 WebP 변환 또는 추가 최적화 고려 필요.

---

## ✅ 해결된 기술 부채 (Resolved Debt)

### [2026-01-18] SceneCanvas의 `scene(imageUrl)` 전이 SSOT 확정 (RU-003-T1)

- **해결 내용**: `TurnOutput` 스키마에 `ui.scene.image_url` 필드를 추가하고, `worldStore`에서 이를 기반으로 한 상태 전이 자동화 로직을 구축함.
- **결과**: `App.tsx`의 "미정" TODO 제거 및 Scene 상태 결정권의 계약(Schema) 이관 완료.
- **관련 작업**: [RU-003-T1] 리팩토링 완료 내역 참조 (vibe/progress.md)
