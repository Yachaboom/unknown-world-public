# [U-068[Mvp]] 참조 이미지 연결성 강화 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-068[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-05 16:15
- **담당**: AI Agent

---

## 1. 작업 요약

이전 턴에서 생성된 장면 이미지를 다음 턴의 참조 이미지(Reference Image)로 활용하여, 연속된 장면 간의 시각적 일관성(아트 스타일, 캐릭터, 톤)을 유지하는 기능을 구현했습니다. 프론트엔드에서 이전 이미지 URL을 관리하고 백엔드의 이미지 생성 파이프라인으로 전달하는 구조를 확립했습니다.

---

## 2. 작업 범위

- **프론트엔드**: `worldStore`에서 `previousImageUrl`을 추적하고, 이미지 생성 요청(`ImageJob`) 시 이를 `reference_image_url`로 포함하여 백엔드에 전달하는 로직 구현.
- **백엔드**: 전달받은 참조 이미지 URL로부터 이미지를 로드하고, Gemini API 호출 시 `image_reference` 매개변수로 포함하여 일관된 이미지를 생성하도록 오케스트레이터 및 서비스 레이어 수정.
- **연결성 강화**: `has_reference` 플래그를 통한 로깅 및 모니터링 체계 구축.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | 참조 이미지 로드 및 Gemini API 연동 로직 추가 |
| `backend/src/unknown_world/models/turn.py` | 수정 | `ImageJob` 모델에 `reference_image_url` 필드 추가 |
| `frontend/src/stores/worldStore.ts` | 수정 | 이전 턴 이미지 URL 관리 및 요청 시 전달 로직 구현 |
| `vibe/unit-runbooks/U-068-reference-image-runbook.md` | 신규 | 기능 검증을 위한 상세 실행 가이드 작성 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:

- **Backend**: `ImageGenerationService.generate_image(prompt, reference_image_url=None)`
  - URL이 전달되면 로컬 캐시 또는 원격지에서 이미지를 로드하여 Gemini API의 `reference_images` 인자로 전달.
- **Frontend**: `useWorldStore.actions.generateImage(prompt)`
  - 현재 `sceneState.imageUrl`을 `referenceImageUrl`로 캡처하여 요청 바디에 포함.

**설계 패턴/원칙**:

- **참조 이미지 일관성**: Gemini 3 모델의 `image_reference` 기능을 활용하여 텍스트 프롬프트만으로는 한계가 있는 시각적 연속성을 보장.
- **지연 바인딩(Late Binding)**: 이미지 생성이 완료되기 전까지 이전 턴의 이미지를 참조로 유지하여 안정적인 연결성 확보.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 생성된 이미지는 `.data/images/generated/`에 저장되며, 참조 시 해당 경로를 우선 탐색함.
- **빌드/의존성**: Gemini SDK의 최신 기능을 사용하므로 `google-genai` 라이브러리 버전 확인 필요 (v1.60.0 이상).

### 4.3 가정 및 제약사항

- 참조 이미지는 1장만 지원함 (Gemini API 사양 및 비용 최적화).
- 참조 이미지는 로컬에 존재하거나 유효한 접근 가능한 URL이어야 함.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-068-reference-image-runbook.md`
- **실행 결과**: 런북에 정의된 시나리오 A, B, C를 통해 연속된 턴에서 `has_reference=True` 로그 및 시각적 일관성 유지 확인 완료.

---

## 6. 리스크 및 주의사항

- **이미지 생성 지연**: 참조 이미지를 로드하고 API에 전달하는 과정에서 약간의 추가 지연이 발생할 수 있음.
- **품질 저하**: 참조 이미지와 프롬프트가 상충할 경우 모델이 혼동을 일으킬 수 있으므로 프롬프트 최적화가 병행되어야 함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-069**: 참조 이미지를 활용한 이미지 편집 기능(Inpainting/Outpainting) 확장.
2. **품질 튜닝**: 다양한 아트 스타일에서의 참조 이미지 영향도 평가 및 프롬프트 엔지니어링 강화.

### 7.2 의존 단계 확인

- **선행 단계**: U-080 (API 인증), U-066 (이미지 지연 흡수)
- **후속 단계**: U-069 (이미지 편집 기반 연결성)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
