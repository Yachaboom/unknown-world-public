# U-076 런북: "정밀분석" Agentic Vision 분석 및 핫스팟 추가 검증

## 개요

이 런북은 U-076[Mvp]에서 구현한 "정밀분석" 기능의 수동 검증 시나리오를 제공합니다.

**핵심 기능**:
- Scene 이미지가 존재할 때 ActionDeck에 "정밀분석" 카드 노출
- 카드 선택 시 Agentic Vision(`gemini-3-flash-preview` + Code Execution)으로 이미지 분석
- 분석 결과 오브젝트(affordance)를 핫스팟(Box2D, 0~1000)으로 추가
- "장면을 자세히 살펴보니..." 내러티브 생성 (새 이미지 생성 없음)
- 실패/차단 시 안전한 폴백 내러티브
- 1.5x Signal 비용 적용

---

## 사전 조건

1. 백엔드 서버 실행 중 (`http://localhost:8011`)
2. 프론트엔드 개발 서버 실행 중 (`http://localhost:5173`)
3. 유효한 Gemini API 키가 `.env`에 설정됨
4. Scene 이미지가 생성된 상태 (이미지 생성 턴 1회 이상 필요)

---

## 실행 가이드 (Startup Guide)

### 1. 백엔드 서버 실행
```powershell
# 루트 디렉토리에서
pnpm dev:back
# 또는 backend 디렉토리에서 직접 실행
cd backend
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2. 프론트엔드 서버 실행
```powershell
# 루트 디렉토리에서
pnpm dev:front
# 또는 frontend 디렉토리에서 직접 실행
cd frontend
pnpm dev
```

### 3. 환경 변수 확인 (`backend/.env`)
```env
GOOGLE_API_KEY=your_gemini_api_key_here
UW_MODE=development
```

---

## 시나리오 1: 정밀분석 카드 노출 확인

### 목적
Scene 이미지가 존재할 때 "정밀분석" 카드가 ActionDeck에 표시되는지 확인

### 절차

1. 브라우저에서 `http://localhost:5173` 접속
2. 프로필 선택 후 게임 시작
3. 이미지가 생성되는 액션을 실행하여 Scene 이미지 표시
4. ActionDeck 카드 목록 확인

### 예상 결과

- ActionDeck에 `🔍 정밀분석` 배지가 붙은 카드 표시
- 카드에 시안(cyan) 테두리 표시
- 비용에 `x1.5` 배수 표기
- 이미지가 없는 장면에서는 해당 카드 미표시

---

## 시나리오 2: 정밀분석 카드 클릭 → Agentic Vision 실행

### 목적
"정밀분석" 카드 클릭 시 이미지 분석이 실행되고 핫스팟이 추가되는지 확인

### 절차

1. 시나리오 1 이후 상태에서 진행
2. "정밀분석" 카드 클릭
3. Scene Canvas 확인
4. Narrative 확인

### 예상 결과

- Scene Canvas에 새로운 핫스팟(클릭 가능 오브젝트) 표시
- 핫스팟에 라벨/힌트 표시 (호버 시)
- 내러티브에 "장면을 자세히 살펴봅니다... {오브젝트 목록}이(가) 눈에 들어옵니다." 추가
- **새 이미지 생성 없음** (기존 이미지 유지)
- Economy HUD에 1.5x 비용 반영

---

## 시나리오 3: 키워드 트리거 확인

### 목적
텍스트 입력에서 정밀분석 키워드가 감지되는지 확인

### 절차

1. Scene 이미지가 있는 상태에서 텍스트 입력창에 "정밀분석을 해본다" 입력
2. 실행 후 결과 확인
3. "장면 분석" 키워드로도 테스트

### 예상 결과

- 정밀분석 트리거 키워드 감지 시 Agentic Vision 실행
- 시나리오 2와 동일한 결과

### 트리거 키워드 목록 (테스트용)
```
한글: 정밀분석, 장면 분석, 이미지 분석, 자세히 보기
영어: analyze scene, deep analyze, look closely, examine scene
```

### 트리거 액션 ID 목록
```
deep_analyze, 정밀분석, analyze_scene, examine_scene, look_closely
```

---

## 시나리오 4: 비용 1.5x 확인

### 목적
정밀분석 액션의 비용 배수가 정확히 1.5x 적용되는지 확인

### 절차

1. ActionDeck에서 일반 카드(예: "탐색하기") 호버 → Economy HUD 확인
2. "정밀분석" 카드 호버 → Economy HUD 확인
3. 비용 비율 비교

### 예상 결과

- 정밀분석 카드의 예상 비용이 기본 비용의 1.5배 (올림)
- 카드 비용 표시에 `x1.5` 배수 표기
- 시안 색상으로 비용 강조 표시

---

## 시나리오 5: 이미지 없이 정밀분석 트리거

### 목적
Scene 이미지가 없을 때 정밀분석이 건너뛰어지는지 확인

### 절차

1. 게임 시작 직후 (Scene 이미지 없는 상태)
2. 텍스트 입력으로 "정밀분석" 입력 후 실행

### 예상 결과

- Agentic Vision이 실행되지 않음
- 일반 턴 처리 (기존 동작)

---

## 시나리오 6: 분석 실패 폴백 확인

### 목적
Vision 분석 실패 시 안전한 폴백이 제공되는지 확인

### 절차

1. 네트워크를 일시적으로 차단하거나 유효하지 않은 API 키 사용
2. "정밀분석" 카드 클릭
3. 결과 확인

### 예상 결과

- 폴백 내러티브 표시: "자세히 봐도 특별한 것은 보이지 않습니다."
- 게임이 중단되지 않고 정상 진행
- 핫스팟 변경 없음

---

## 시나리오 7: 핫스팟 좌표 규약 확인 (RULE-009)

### 목적
Vision 분석으로 생성된 핫스팟이 0~1000 정규화 좌표를 사용하는지 확인

### 절차

1. 시나리오 2 실행 후 핫스팟 생성 확인
2. 브라우저 DevTools > Network에서 응답 JSON 확인
3. `ui.objects[].box_2d` 값 확인

### 예상 결과

- 모든 좌표 값이 0~1000 범위
- bbox 순서: `{ymin, xmin, ymax, xmax}`
- 픽셀 좌표 사용하지 않음

---

## 시나리오 8: 잔액 부족 시 정밀분석 카드 비활성화

### 목적
잔액이 1.5x 비용보다 부족할 때 정밀분석 카드가 비활성화되는지 확인

### 절차

1. Signal 잔액이 낮은 상태로 시작 (또는 액션 실행으로 소진)
2. "정밀분석" 카드의 비용(1.5x)이 현재 잔액보다 높은 상황 확인
3. 해당 카드 상태 확인

### 예상 결과

- 잔액 < 정밀분석 비용일 때 카드 비활성화
- "잔액 부족" 메시지 표시

---

## 문제 해결

### 정밀분석 카드가 표시되지 않음

1. GM 프롬프트에 "정밀분석" 카드 규칙이 포함되어 있는지 확인
2. `turn_output_instructions.ko.md`에서 `deep_analyze` 카드 규칙 확인
3. 이미지가 존재하는 장면인지 확인

### 핫스팟이 추가되지 않음

1. 백엔드 로그에서 `[Resolve] 정밀분석 성공 (U-076)` 메시지 확인
2. Vision 서비스 응답에 affordances가 포함되어 있는지 확인
3. 이미지 URL이 유효하고 접근 가능한지 확인

### 비용 배수가 적용되지 않음

1. `TextModelTiering.VISION_COST_MULTIPLIER` 값 확인 (1.5)
2. 프론트엔드 `VISION_COST_MULTIPLIER` 상수 값 확인
3. Resolve Stage에서 `ctx.cost_multiplier` 설정 확인

### Vision API 호출 실패

1. Gemini API 키 유효성 확인
2. `gemini-3-flash-preview` 모델 접근 가능 여부 확인
3. 이미지 URL이 로컬 서버에서 접근 가능한지 확인 (`/static/` 경로)

---

## 체크리스트

- [ ] 이미지 있는 장면에서 정밀분석 카드 노출
- [ ] 이미지 없는 장면에서 정밀분석 카드 미노출
- [ ] 카드 클릭 시 Agentic Vision 실행
- [ ] 분석 결과 핫스팟 추가 (0~1000 좌표)
- [ ] "장면을 자세히 살펴봅니다..." 내러티브 추가
- [ ] 새 이미지 생성 없음 확인
- [ ] 1.5x 비용 배수 적용
- [ ] 카드에 🔍 VISION 배지 + 시안 테두리
- [ ] 비용에 x1.5 표기
- [ ] 분석 실패 시 폴백 내러티브
- [ ] 잔액 부족 시 카드 비활성화

---

## 관련 파일

**백엔드**:
- `backend/src/unknown_world/services/agentic_vision.py` - Agentic Vision 서비스
- `backend/src/unknown_world/config/models.py` - VISION 트리거/비용 설정
- `backend/src/unknown_world/orchestrator/stages/resolve.py` - Resolve Stage 정밀분석 분기
- `backend/prompts/vision/scene_affordances.ko.md` - Vision 프롬프트 (한국어)
- `backend/prompts/vision/scene_affordances.en.md` - Vision 프롬프트 (영어)
- `backend/prompts/turn/turn_output_instructions.ko.md` - GM 프롬프트 (정밀분석 카드 규칙)

**프론트엔드**:
- `frontend/src/components/ActionDeck.tsx` - VISION 카드 표시
- `frontend/src/style.css` - VISION 카드 CSS
- `frontend/src/locales/ko-KR/translation.json` - i18n (정밀분석 라벨)

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-02-07 | 1.0 | 초기 작성 (U-076 구현) |
