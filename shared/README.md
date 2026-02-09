# shared/

이 디렉토리는 **프론트엔드와 백엔드 간 공유되는 스키마/타입 정의**를 위한 SSOT(Single Source of Truth) 디렉토리입니다.

## 📁 구조

```
shared/
├── schemas/
│   └── turn/                         # Turn 계약 스키마 (TurnInput/TurnOutput)
│       ├── turn_input.schema.json    # Client → Server 요청 스키마
│       └── turn_output.schema.json   # Server → Client 응답 스키마
└── README.md
```

## 🔄 SSOT 원칙 (RU-001-Q4)

- **SSOT는 `shared/schemas/`의 JSON Schema 파일**입니다.
- 백엔드(Python/Pydantic)와 프론트엔드(TS/Zod)의 타입/검증 코드는 **이 스키마로부터 생성 또는 동기화**됩니다.
- 스키마 변경 시 양쪽(backend/frontend)에 영향이 있음을 반드시 인지해야 합니다.

### 소비 전략 (Option B: 생성물 기반 동기화)

| 소비자               | 도구/방식                                   | 생성물 경로 (권장)                             |
| -------------------- | ------------------------------------------- | ---------------------------------------------- |
| **Backend (Python)** | `datamodel-code-generator` 또는 수동 동기화 | `backend/src/unknown_world/schemas/generated/` |
| **Frontend (TS)**    | `json-schema-to-zod` 또는 수동 동기화       | `frontend/src/schemas/generated/`              |

> **MVP 단계에서는 수동 동기화**로 시작하고, drift가 발생하면 생성 스크립트를 도입합니다.

## 📋 스키마 파일 목록

### Turn 계약 (MVP)

| 파일                           | 용도                    | PRD 참조             |
| ------------------------------ | ----------------------- | -------------------- |
| `turn/turn_input.schema.json`  | Client → Server 턴 요청 | PRD 8.7절 TurnInput  |
| `turn/turn_output.schema.json` | Server → Client 턴 응답 | PRD 8.7절 TurnOutput |

## ✅ 스키마 작성 가이드라인

- **지원 타입**: `string`, `number`, `integer`, `boolean`, `object`, `array`, `null`
- **권장 속성**: `required`, `enum`, `description`을 적극 사용
- **엄격 모드**: `additionalProperties: false`로 예측 가능성 확보
- **평평한 구조**: 과도한 중첩을 피하고 단순한 스키마 유지
- **참조**: `vibe/ref/structured-outputs-guide.md`

## ⚠️ 보안 주의사항 (RULE-007)

- **절대로 서비스 계정 키, 크리덴셜, 비밀정보를 이 디렉토리에 배치하지 마세요.**
- 키 파일은 반드시 `secrets/` 디렉토리에만 배치합니다 (`.gitignore`로 차단됨).
- 스키마 파일은 "계약 문서"이므로 커밋해도 보안 위험이 없습니다 (단, 비밀값 포함 금지).

## 📚 관련 문서

- `vibe/refactors/RU-001-Q4.md` - JSON Schema SSOT 도입 근거
- `vibe/refactors/RU-001-S1.md` - .gitignore JSON 정책 변경 근거
- `vibe/ref/structured-outputs-guide.md` - Gemini Structured Output 가이드
- `vibe/prd.md` (8.7절) - TurnInput/TurnOutput 설계 방향
- `.cursor/rules/00-core-critical.mdc` - RULE-003 (이중 검증), RULE-007 (보안)
