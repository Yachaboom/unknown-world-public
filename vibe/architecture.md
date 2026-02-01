# Unknown World 아키텍처 가이드

## 1. 시스템 개요

Unknown World는 **Gemini 기반의 에이전트형 세계 엔진**과 멀티모달 파이프라인을 결합한 무한 생성 로그라이크 내러티브 웹게임입니다. 시스템은 상태 기반 오케스트레이터와 고수준 게임 UI로 구성됩니다.

## 2. 프로젝트 구조

### 디렉토리 구조 (Tree)

```text
D:\Dev\unknown-world\
├── backend/               # 백엔드 (FastAPI + Pydantic)
│   ├── prompts/           # 프롬프트 저장소 (XML 규격 적용)
│   │   ├── system/        # 시스템/페르소나 프롬프트
│   │   ├── turn/          # 출력 지시사항 프롬프트
│   │   └── image/         # 이미지 스타일 가이드라인
│   ├── src/
│   │   └── unknown_world/
│   │       ├── api/        # API 엔드포인트 및 스트림 이벤트 계약
│   │       │   ├── image.py (이미지 생성 API)
│   │       │   ├── scanner.py (이미지 이해 API)
│   │       │   ├── turn.py (메인 턴 스트리밍)
│   │       │   ├── turn_stream_events.py (스트림 이벤트 SSOT)
│   │       │   └── turn_streaming_helpers.py (스트리밍 유틸리티)
│   │       ├── config/     # 모델 및 시스템 설정
│   │       │   └── models.py (모델 라벨/ID 매핑)
│   │       ├── orchestrator/ # 오케스트레이션 엔진
│   │       │   ├── pipeline.py (7대 단계 실행기 및 서비스 주입)
│   │       │   ├── stages/    # 단계별 독립 모듈 (Parse~Commit)
│   │       │   │   ├── render.py (메인 렌더링 및 이미지 생성 브릿지)
│   │       │   │   ├── render_helpers.py (판정, 폴백 결과 생성 및 안전 차단 감지 헬퍼)
│   │       │   │   └── ...
│   │       │   ├── fallback.py (안전 폴백 SSOT)
│   │       │   ├── mock.py (결정적 다양성 모의 엔진)
│   │       │   ├── prompt_loader.py (XML/Frontmatter 로더)
│   │       │   ├── repair_loop.py (자기 수정 루프)
│   │       │   └── validator.py (비즈니스 룰 검증)
│   │       ├── services/   # 외부 서비스 연동
│   │       │   ├── genai_client.py (Vertex AI SDK 래퍼)
│   │       │   ├── image_generation.py (Gemini 3 Pro Image)
│   │       │   ├── image_postprocess.py (rembg 배경 제거)
│   │       │   ├── image_understanding.py (이미지 분석/아이템화)
│   │       │   └── rembg_preflight.py (모델 사전 점검)
│   │       ├── storage/    # 스토리지 추상화 및 경로 관리
│   │       │   ├── local_storage.py (로컬 파일 시스템)
│   │       │   ├── paths.py (경로/URL 상수 SSOT)
│   │       │   └── validation.py (파일 제한 정책)
│   │       ├── validation/ # 특수 검증 로직
│   │       │   ├── business_rules.py
│   │       │   └── language_gate.py (언어 혼합 방지)
│   │       └── models/     # Pydantic 데이터 모델
│   ├── tests/              # 통합 및 단위 테스트
│   │   ├── unit/
│   │   │   ├── orchestrator/
│   │   │   │   ├── test_u054_image_fallback.py (폴백 검증)
│   │   │   │   └── ...
│   │   │   └── ...
│   └── pyproject.toml      # Python 의존성 관리 (uv)
├── frontend/              # 프론트엔드 (React 19 + Vite 7 + TS 5.9)
│   ├── src/
│   │   ├── api/            # API 클라이언트 (Streaming/Scanner)
│   │   ├── components/     # 게임 UI 컴포넌트 (HUD/Canvas/Console 등)
│   │   ├── locales/        # i18n 리소스 (ko-KR/en-US)
│   │   ├── save/           # 세션 관리 및 마이그레이션 (U-041)
│   │   ├── stores/         # Zustand 상태 슬라이스
│   │   ├── turn/           # Turn Runner 실행 엔진
│   │   ├── utils/          # 좌표 변환 및 공통 유틸리티
│   │   └── schemas/        # Zod 스키마 검증
│   └── package.json        # Node.js 의존성 및 스크립트
├── shared/                # 공유 리소스 (JSON Schema SSOT)
└── vibe/                  # SSOT 문서 및 작업 기록
```

### 주요 디렉토리 책임

- **`frontend/`**: 게임 HUD, 액션 덱, 인벤토리, 씬 캔버스 등 사용자 인터페이스 담당. Zustand로 월드 상태 관리. i18n 기반의 다국어 지원 및 구버전 데이터 마이그레이션(U-041) 포함. **U-049/U-050 전략에 따라 레이아웃 안정성과 오버레이 가독성(Option A: 테두리 중심 강조)을 확보하고, 모바일 반응형 툴팁 폴리시를 적용함.**
- **`backend/`**: FastAPI 기반의 오케스트레이터 서버. 7단계 파이프라인을 통한 턴 처리, Vertex AI 연동, 이미지 후처리(rembg) 및 스토리지 관리 담당.
- **`shared/`**: 백엔드(Pydantic)와 프론트엔드(Zod)가 공유하는 **데이터 계약(Data Contract)** 스키마 저장소.
- **`vibe/`**: 계획(`unit-plans`), 결과(`unit-results`), 검증(`unit-runbooks`)을 포함한 프로젝트의 모든 기술 결정 사항과 히스토리를 기록하는 단일 진실 공급원(SSOT).

---

## 3. 실행 및 도구 설정 (SSOT)

Unknown World는 환경에 따른 동작 차이를 최소화하기 위해 다음 SSOT 정책을 따릅니다.

1. **실행 커맨드 SSOT**: 루트 `package.json`의 `scripts`.
2. **도구 및 의존성 고정 (Pinning)**: 루트 `package.json` 및 `vibe/tech-stack.md` 기준.
3. **포트 정책 (RULE-011)**: 프론트 8001, 백엔드 8011 기본. `pnpm kill`을 통한 안전한 포트 기반 프로세스 종료.

---

## 4. 핵심 아키텍처 원칙

1. **Stateful Orchestrator**: 월드 상태(WorldState)를 유지하고 갱신하는 시스템.
2. **Structured Turn Contract**: 엄격한 JSON Schema 기반 통신.
3. **Resilient Pipeline (RU-005 / Repair Loop / U-051)**: 
    - **Pipeline SSOT**: 모든 턴 처리는 `orchestrator/pipeline.py`에 정의된 7대 단계를 따름.
    - **Stage Modularity**: 각 단계는 독립된 함수로 모듈화되어 있으며, `PipelineContext`를 통해 상태 전이.
    - **Service Injection (U-051)**: `PipelineContext` 생성 시 `image_generator` 등 핵심 서비스를 주입하거나 자동으로 획득하여 단계 간 서비스 공유.
    - **Conditional Image Generation (U-052)**: 모델의 `image_job` 요청을 경제 잔액, 프롬프트 유효성, `should_generate` 플래그를 기반으로 종합 판정하여 불필요한 비용 및 지연 방지.
    - **Async Data Synchronization (U-053)**: 비동기(`await`) 이미지 생성을 수행하고, 생성된 `image_url` 및 메타데이터를 `TurnOutput` 응답에 원자적으로 동기화하여 프론트엔드에 전달.
    - **Deterministic Diversity (U-048[Mvp])**: Mock 모드에서도 per-turn RNG를 통해 결정적 다양성 확보.
4. **Guaranteed Safe Fallback**: 모든 오류 상황에서 입력 시점의 재화를 보존하는 **안전 폴백 TurnOutput** 생성 보장.
5. **이중 검증**: 서버(Pydantic) 및 클라이언트(Zod)에서 모든 데이터를 전수 검증함.

---

## 9. Economy/재화 관리 정책 (U-014, U-042[Mvp])

1. **거래 장부(Ledger) 시스템 (U-042)**:
    - 모든 재화 변동은 **거래 장부(ko-KR: 거래 장부, en-US: Resource Log)**에 기록됨.
    - 내부 구현 용어는 `ledger`를 유지하되, UI 카피는 게임 친화적인 용어로 통일하여 몰입도 향상.
    - **Option A 정책**: 최근 20개 엔트리만 보관하며, 세션 내에서만 유지됨.
2. **비용 인바리언트 (RULE-005)**:
    - **사전 비용 노출**: 액션 실행 전 예상 비용(`min`, `max`)을 HUD에 표시.
    - **잔액 음수 금지**: 잔액 초과 액션 차단 및 저비용 대안(Alternative) 제안.
3. **가시성 및 식별성 (U-037)**:
    - 재화 데이터는 `critical` 중요도를 부여하여 가독성 보호.

---

## 10. 스트리밍 및 에러 핸들링 정책

- **종료 인바리언트**: 모든 스트림은 정확히 1개의 `final` 이벤트로 종료.
- **연결 상태 복구 (RU-003-S1)**: 스트림 결과에 따른 `connected` 상태 자동 관리.
- **Scene 상태 전이 (RU-003-T1)**: `image_url` 존재 여부에 따른 `sceneState` 자동 결정 (SSOT).
- **Abort(취소) 정책**: 사용자에 의한 중단 시 UI를 안전하게 스트리밍 종료 상태로 복구.

---

## 17. Preflight 및 모델 관리 정책 (U-045[Mvp])

1. **서버 시작 시 프리플라이트**: `rembg` 및 필수 모델 상태 자동 점검 및 부재 시 다운로드 시도.
2. **Degraded 모드**: 모델 다운로드 실패 시에도 서버 가용성을 유지하며 후처리 기능만 비활성화.
3. **런타임 가드**: 대용량 다운로드에 의한 런타임 지연 원천 차단.

---

## 18. Scanner 및 멀티모달 조작 정책 (U-022[Mvp])

1. **Scanner 슬롯 아키텍처**: 이미지 업로드 → 비전 분석 → 상태 머신(`uploading`~`result`) 관리.
2. **아이템화 정책 (Option B)**: 분석 결과를 사용자가 선택하여 인벤토리에 추가 (의도적 통제권).
3. **이미지 임시 저장 (RU-006-S1)**: 디버깅 목적으로 `.data/images/uploaded/`에 선택적 저장 지원.
4. **좌표 규약 준수**: 모든 분석 결과의 `box_2d`는 0~1000 정규화 좌표계 유지.

---

## 11. 세션 및 세이브 관리 정책 (U-015, U-041[Mvp])

1. **SaveGame 마이그레이션 (U-041)**:
    - **Version-First**: 버전 식별 후 순차적 마이그레이션 체인 실행.
    - **데이터 보정**: 필드 오타 수정 및 누락 필드 기본값 주입으로 무결성 보장.
2. **복원 정합성 (RU-004)**: 비동기 언어 로딩 대기 및 거래 장부 스냅샷 주입을 통한 완벽한 상태 복구.

---

## 15. 프롬프트 관리 및 i18n 정책 (U-036, U-046[Mvp])

1. **프롬프트 외부화**: 핵심 프롬프트를 `.md` 파일로 분리 관리 (SSOT).
2. **XML 태그 규격 (U-046)**: `<prompt_meta>` 및 `<prompt_body>` 태그 도입으로 구조화 및 오염 방지.
3. **개발 모드 핫리로드**: 파일 수정 시 서버 재시작 없이 즉시 반영.

---

## 16. 세션 언어 SSOT 및 i18n 정책 (U-044[Mvp])

1. **세션 언어 SSOT**: `SaveGame.language`를 유일한 권위자로 설정.
2. **언어 전환 정책 (토글 = 리셋)**: 혼합 출력 방지를 위해 플레이 중 언어 변경 시 세션 리셋 강제.
3. **클라이언트 에러 i18n**: 하드코딩된 영문 에러 메시지를 완전히 제거하고 i18n 엔진에 통합.

---

## 19. 레이아웃 및 스크롤 정책 (U-049[Mvp])

1. **컬럼 스크롤 차단 (Isolation)**: `.sidebar-left`, `.sidebar-right` 등 메인 컬럼은 `overflow: hidden`으로 고정하여 "전체 스크롤" 발생을 억제.
2. **패널 내부 스크롤 (Content-first)**: 스크롤은 반드시 `.panel-content` 또는 특정 리스트 영역(`.ledger-list`, `.narrative-list`) 내부에서만 발생하도록 제한.
3. **Flexbox 하위 스크롤 보장**: 컨테이너가 자식의 높이에 맞춰 늘어나지 않도록 `min-height: 0`을 명시적으로 적용하여 내부 스크롤 기반 확보.
4. **동적 뷰포트 최적화**: `100dvh`를 활용하여 모바일 주소창 등에 의한 불필요한 첫 화면 스크롤 제거.
5. **자동 스크롤 (Auto-focus)**: 거래 장부(Economy HUD) 등 실시간 데이터 누적 영역은 최신 항목이 보이도록 하단 자동 스크롤(`useRef`/`useEffect`) 적용.

---

## 20. 이미지 파이프라인 및 조건부 생성 정책 (U-052[Mvp])

1. **조건부 생성 판정 (Conditional Logic)**:
    - **플래그 검증**: `image_job.should_generate`가 `true`일 때만 생성 프로세스 진입.
    - **프롬프트 가드**: 모델이 플래그를 `true`로 주더라도 프롬프트가 비어있거나 공백만 있는 경우 생성을 차단하여 API 오류 방지.
2. **이미지 생성 비용 정책 (RULE-005)**:
    - **고정 비용**: MVP 기준 이미지 생성 1회당 **10 Signal** 고정 비용 부과 (Option A).
    - **잔액 검증**: 현재 잔액(`economy_snapshot.signal`)이 생성 비용보다 적을 경우 생성을 거부하고 텍스트-only 폴백으로 전환.
3. **프롬프트 보안 및 로깅 (RULE-007)**:
    - **해시 로깅**: 프롬프트 원문을 로그에 남기지 않으며, SHA-256 해시의 앞 8자리를 사용하여 추적성 확보.
4. **언어별 폴백 메시지 (RULE-006)**:
    - 잔액 부족으로 생성 실패 시 세션 언어(`ko-KR`/`en-US`)에 맞는 안내 메시지를 제공.

---

## 21. 비동기 이미지 생성 및 데이터 동기화 정책 (U-053[Mvp])

1. **비동기 생성 파이프라인**:
    - **Non-blocking Flow**: 내러티브 결정 후 `render_stage`에서 비동기(`await`)로 이미지 생성을 수행하여 텍스트 스트리밍 품질 유지.
    - **Service Integration**: 주입된 `ImageGenerator` 인터페이스를 통해 실제/모의 이미지 생성 요청을 처리.
2. **응답 데이터 동기화 (Option A)**:
    - **Atomic Schema Update**: Pydantic의 `model_copy(update=...)`를 활용하여 생성된 `image_url`, `image_id`, `generation_time_ms` 등의 메타데이터를 `TurnOutput` 객체에 직접 주입.
    - **Frontend Connection**: 프론트엔드의 `SceneCanvas`가 즉시 소비할 수 있도록 서빙 가능한 정적 URL(`STATIC_URL_PREFIX`) 형식으로 제공.
3. **로깅 및 가시성 (RULE-007, RULE-008)**:
    - **보안 로깅**: 프롬프트 원문 대신 해시를 로그에 남기고, 생성 소요 시간 및 성공 여부를 기록하여 운영 가시성 확보.
---

## 22. 이미지 생성 폴백 및 실패 복구 정책 (U-054[Mvp])

1. **실패 내성 구조 (Fault Tolerance)**:
    - **RULE-004 준수**: 이미지 생성 중 발생하는 모든 예외(`TimeoutError`, `ValueError`, `API Error` 등)를 포착하여 시스템 중단 없이 텍스트-only 모드로 즉시 전이.
    - **재시도 최소화 (Option A)**: 지연 시간 단축을 위해 이미지 실패 시 재시도 없이 즉시 폴백 수행 (Retry Count: 0).
2. **안전 차단(Safety Blocked) 대응**:
    - **키워드 기반 감지**: 응답 메시지 내 "safety", "blocked", "policy" 등 키워드 포함 여부로 차단 여부 판별.
    - **상태 동기화**: 차단 감지 시 `TurnOutput.safety.blocked`를 `true`로 설정하고, 언어별 안전 안내 메시지 제공.
3. **배지 및 가시성 연동**:
    - **Badges SSOT**: 안전 차단 시 기존 `SAFETY_OK` 배지를 제거하고 `SAFETY_BLOCKED` 배지를 즉시 반영하여 Agent Console에 시스템 증거 노출.
4. **다국어 폴백 메시지 (RULE-006)**:
    - 실패 유형(일반 실패, 안전 차단, 잔액 부족)에 따라 `ko-KR`/`en-US` 언어 정책에 정렬된 전용 메시지 템플릿 사용.
