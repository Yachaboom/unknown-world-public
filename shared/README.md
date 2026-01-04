# shared/

이 디렉토리는 **프론트엔드와 백엔드 간 공유되는 스키마/타입 정의**를 위한 SSOT(Single Source of Truth) 디렉토리입니다.

## 📁 구조

```
shared/
├── schemas/          # JSON Schema 파일 (Pydantic/Zod 검증용)
│   ├── turn_input.schema.json
│   ├── turn_output.schema.json
│   └── ...
└── README.md
```

## ⚠️ 보안 주의사항 (RULE-007)

- **절대로 서비스 계정 키, 크리덴셜, 비밀정보를 이 디렉토리에 배치하지 마세요.**
- 키 파일은 반드시 `secrets/` 디렉토리에만 배치합니다 (`.gitignore`로 차단됨).

## 📋 관련 문서

- `vibe/refactors/RU-001-S1.md` - JSON 정책 변경 근거
- `vibe/ref/structured-outputs-guide.md` - 스키마 작성 가이드
- `.cursor/rules/00-core-critical.mdc` - RULE-007 (보안 규칙)

