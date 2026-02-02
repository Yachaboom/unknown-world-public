# U-064[Mvp]: Gemini 이미지 생성 API 호출 방식 수정 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-064[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-02 16:30
- **담당**: AI Agent

---

## 1. 작업 요약

`gemini-3-pro-image-preview` 모델의 올바른 API 호출 방식인 `generate_content()`를 적용하여, Real 모드에서 발생하던 `ClientError`를 해결하고 이미지 생성 파이프라인의 안정성을 확보하였습니다.

---

## 2. 작업 범위

- **API 메서드 전환**: `generate_images()` → `aio.models.generate_content()`
- **응답 파싱 로직 구현**: 멀티모달 응답(Text + Image)에서 이미지 데이터(`inline_data`) 추출 및 디코딩
- **타임아웃 최적화**: 이미지 생성 소요 시간(15-60초)을 고려하여 타임아웃을 60초로 상향 조정
- **디버깅 강화**: 이미지 생성 과정 중의 텍스트 응답(Thinking 과정) 로깅 기능 추가
- **Mock 모드 유지**: 기존 테스트 환경을 위한 MockImageGenerator와의 호환성 유지

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | API 호출 방식 변경 및 응답 파싱 로직 구현 |
| `backend/tests/manual_test_image.py` | 신규 | Real 모드 이미지 생성 직접 검증을 위한 테스트 스크립트 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 변경 사항**:
- **API 호출**: `self._client.aio.models.generate_content`를 사용하며, `GenerateContentConfig(response_modalities=[Modality.TEXT, Modality.IMAGE])`를 통해 멀티모달 출력을 요청합니다.
- **데이터 추출**: `response.candidates[0].content.parts`를 순회하며 `inline_data` 속성이 있는 파트를 찾아 이미지 바이트를 추출합니다.
- **비동기 타임아웃**: `asyncio.wait_for`를 사용하여 60초 타임아웃을 강제합니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 생성된 이미지는 `.data/images/generated/` 디렉토리에 PNG 형식으로 저장됩니다.
- **권한/보안**: Vertex AI 서비스 계정 권한이 필요하며, 환경변수(`VERTEX_PROJECT`, `VERTEX_LOCATION`)를 통해 설정됩니다.
- **UI 연동**: 생성된 이미지의 서빙 URL이 `ImageGenerationResponse`를 통해 반환되어 프론트엔드 `SceneCanvas`에서 즉시 사용 가능합니다.

### 4.3 가정 및 제약사항

- **타임아웃**: 이미지 생성은 모델 부하에 따라 최대 60초까지 소요될 수 있습니다.
- **재시도 정책**: MVP 단계에서는 실패 시 재시도 없이 즉시 폴백(Mock 또는 Skip) 처리합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-064-gemini-image-api-runbook.md`
- **실행 결과**: 
  - Mock 모드: 즉시 성공 (1x1 플레이스홀더)
  - Real 모드: 약 45초 소요 후 이미지 생성 및 저장 확인 완료
- **참조**: 상세 실행 방법 및 트러블슈팅은 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **비용**: 이미지 생성은 텍스트 생성 대비 높은 비용이 발생하므로 Economy 시스템을 통한 제어가 필수적입니다.
- **할당량(Quota)**: Vertex AI의 이미지 생성 API 할당량 초과 시 `ResourceExhausted` 에러가 발생할 수 있습니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-065**: 스키마 단순화 시 이미지 생성 API 동작 영향 확인
2. **CP-MVP-03**: Real 모드 데모에서 전체 파이프라인 연동 확인

### 7.2 의존 단계 확인

- **선행 단계**: U-055[Mvp] (이미지 파이프라인 통합 검증)
- **후속 단계**: U-065[Mvp]

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
