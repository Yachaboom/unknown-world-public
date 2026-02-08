# U-085[Mvp]: ⚡핫픽스 - 이미지 크기를 현재 UI 레이아웃(Scene Canvas)에 최대한 맞춤으로 생성 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-085[Mvp]
- **단계 번호**: 2.3 (MVP)
- **작성 일시**: 2026-02-08 22:45
- **담당**: AI Agent

---

## 1. 작업 요약

Scene Canvas의 실제 렌더링 크기(px)를 기반으로 이미지 생성 시 최적의 `aspect_ratio`와 `image_size`를 자동 선택하도록 구현했습니다. 이를 통해 생성된 이미지가 UI에 최대한 밀착되어 레터박싱(여백)을 최소화하고 "게임 화면"으로서의 몰입감을 강화했습니다.

---

## 2. 작업 범위

- [x] **Scene Canvas 표시 크기(px) SSOT 확립**: `worldStore`에 `sceneCanvasSize` 상태 추가 및 `SceneCanvas` 컴포넌트의 `ResizeObserver`를 통한 실시간 동기화 구현.
- [x] **UI 레이아웃 기반 크기 선택 로직**: `imageSizing.ts` 유틸리티를 생성하여 10종의 지원 비율(21:9 ~ 9:16) 중 현재 UI에 가장 근접한 값을 선택하는 알고리즘 적용.
- [x] **프론트엔드 요청 파이프라인 최적화**: `turnRunner.ts`에서 이미지 잡 실행 시 측정된 캔버스 크기를 기반으로 `aspectRatio`와 `imageSize`를 주입하도록 수정.
- [x] **백엔드 Gemini SDK 설정 적용**: `image_generation.py`에서 `GenerateContentConfig(image_config=...)`를 적용하여 요청된 비율과 크기가 실제 모델 출력에 반영되도록 개선.
- [x] **이미지 크기 규격 마이그레이션**: `image_size`를 픽셀 문자열(1024x1024)에서 SDK 표준 규격(1K/2K/4K)으로 마이그레이션하고 레거시 호환을 위한 정규화 로직 추가.

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/utils/imageSizing.ts` | 신규 | Canvas 크기 기반 aspect_ratio 및 image_size 선택 유틸리티 |
| `frontend/src/utils/imageSizing.test.ts` | 신규 | 이미지 사이징 로직 검증을 위한 단위 테스트 |
| `frontend/src/stores/worldStore.ts` | 수정 | `sceneCanvasSize` 상태 및 setter 추가 (SSOT) |
| `frontend/src/components/SceneCanvas.tsx` | 수정 | `ResizeObserver`로 측정된 크기를 스토어에 반영 |
| `frontend/src/turn/turnRunner.ts` | 수정 | 이미지 잡 실행 시 레이아웃 최적화 값 주입 |
| `frontend/src/api/image.ts` | 수정 | 이미지 생성 API 인터페이스 및 기본값 업데이트 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | Gemini SDK `image_config` 적용 및 이미지 크기 정규화 |
| `backend/src/unknown_world/storage/validation.py` | 수정 | `SUPPORTED_IMAGE_SIZES` SDK 값 마이그레이션 및 정규화 헬퍼 |
| `backend/src/unknown_world/api/image.py` | 수정 | 이미지 요청 스키마 업데이트 및 정규화 로직 연결 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:

- `selectImageSizing(width, height)`: `CanvasSize`를 입력받아 `{ aspectRatio: string, imageSize: "1K"|"2K"|"4K" }`를 반환합니다.
- `normalize_image_size(size_str)`: 레거시 픽셀 값(예: "1280x768")을 SDK 규격("1K")으로 변환합니다.

**설계 패턴/원칙**:

- **UI 레이아웃 우선 정책**: `image_job`에 프롬프트가 의도한 비율이 있더라도, 실제 표시되는 UI 레이아웃에 맞춰 이미지를 생성하는 것을 우선합니다.
- **SDK 규격 SSOT**: 이미지 크기 단위를 픽셀이 아닌 Gemini SDK가 지원하는 1K/2K/4K 체계로 전환하여 호환성을 높였습니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 생성되는 이미지의 파일 명칭 규칙은 유지되나, 실제 파일의 해상도와 비율이 UI 레이아웃에 따라 가변적으로 생성됩니다.
- **빌드/의존성**: 추가된 의존성은 없으며, `google-genai` SDK의 기능을 최대한 활용하도록 개선되었습니다.

### 4.3 가정 및 제약사항

- **이미지 크기 고정**: MVP 단계에서는 비용과 속도를 고려하여 `image_size`를 `"1K"`로 고정하여 사용합니다.
- **임계치 처리**: 측정된 캔버스 크기가 50px 미만인 경우 기본값(16:9, 1K)으로 폴백합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-085-image-size-layout-fit-runbook.md`
- **실행 결과**: 백엔드 API 호출(curl) 및 프론트엔드 유틸리티 테스트 시나리오 전수 통과 확인.
- **참조**: 상세 실행 방법은 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **캐시 이슈**: 이전 해상도의 이미지가 캐시되어 있을 경우 브라우저에서 비율이 어긋나 보일 수 있으나, 새로 생성되는 이미지부터는 정상 적용됩니다.
- **좌표 규약**: 이미지 비율이 변하더라도 핫스팟 좌표는 `0~1000` 정규화 좌표계를 사용하므로 기존 핫스팟과의 정합성은 유지됩니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **턴 진행 피드백 보강 (U-086)**: 이미지 생성 지연과 타이핑 효과의 동기화 개선.
2. **10분 데모 루프 (CP-MVP-03)**: 다양한 레이아웃(와이드, 모바일 등)에서 이미지 정합성 최종 확인.

### 7.2 의존 단계 확인

- **선행 단계**: U-066(이미지 지연 흡수), U-049(레이아웃 원칙) 완료됨.
- **후속 단계**: ~~U-084(픽셀 스타일 튜닝)~~ (취소됨) 시 최적화된 비율 위에서 작업 가능.

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
