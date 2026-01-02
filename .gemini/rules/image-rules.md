# 이미지/비전(멀티모달) 세부 지침

> **[적용 컨텍스트]**: image, image-generation, image-edit, multimodal, vision, bbox, segmentation, files-api, reference-image, gemini-3-pro-image-preview
>
> **[설명]**: 텍스트 우선 + (조건부) 이미지 생성/편집 + bbox 규약을 결합해 “클릭 가능한 장면”을 만든다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “이미지/비전/멀티모달” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 이미지는 선택적(conditional)이며, 텍스트는 항상 먼저(스트리밍) 제공한다

**설명**: 이미지 생성 지연이 UX를 망치지 않도록 텍스트 우선 + Lazy loading을 기본값으로 둔다.

**올바른 예시 (Do ✅)**:

```
- narrative는 즉시 스트리밍
- render.image_job.should_generate는 정책/재화/중요 장면에서만 true
- 이미지 실패 시 텍스트-only 폴백 + (선택) 재시도
```

**잘못된 예시 (Don't ❌)**:

```
- 매 턴 이미지 생성이 기본값
- 이미지가 끝날 때까지 텍스트도 대기
```

### 규칙 2: 이미지 모델/ID는 고정한다

**설명**: PRD/tech-stack은 이미지 생성/편집 모델을 고정한다.

**올바른 예시 (Do ✅)**:

```
- image generation/edit: gemini-3-pro-image-preview
```

**잘못된 예시 (Don't ❌)**:

```
- 모델 ID를 임의로 변경하거나 프롬프트로만 "고품질"을 해결하려 함
```

### 규칙 3: bbox/핫스팟 좌표는 0~1000 정규화 + [ymin,xmin,ymax,xmax] 고정

**올바른 예시 (Do ✅)**:

```
box_2d: [120, 80, 260, 210]  // 0~1000
```

**잘못된 예시 (Don't ❌)**:

```
box_2d: [80, 120, 210, 260]   // 순서 바뀜
box_2d: [12, 8, 26, 21]       // 0~1000 아닌 0~100처럼 축소
```

### 규칙 4: 프롬프트는 "키워드 나열" 대신 장면 서술(semantic negative prompt) 중심

**올바른 예시 (Do ✅)**:

```
- 원하는 장면을 긍정적으로 서술(구도/조명/시점 포함)
- "하지 마" 나열 대신, "무엇을 보여줄지"를 구체화
```

**잘못된 예시 (Don't ❌)**:

```
- 금지어/부정 프롬프트만 길게 나열
- 장면 정보 없이 스타일 단어만 나열
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 큰 파일/재사용**: 20MB 제한을 넘거나 재사용이 필요하면 Files API 업로드 + URI 참조를 사용한다.
</exceptions>

## 3. 체크리스트

- [ ] 텍스트는 항상 먼저(스트리밍) 나온다
- [ ] image_job은 정책/재화 조건에서만 생성되며, 실패 시 폴백이 있다
- [ ] bbox 규약(0~1000, [ymin,xmin,ymax,xmax])을 지킨다
- [ ] 이미지 모델 ID는 `gemini-3-pro-image-preview`로 고정한다
