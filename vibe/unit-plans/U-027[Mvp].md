# U-027[Mvp]: 개발 스크립트 - pnpm kill 포트 제한(8001~8020)

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-027[Mvp] |
| Phase     | MVP        |
| 예상 소요 | 30분       |
| 의존성    | RU-001[Mvp] |
| 우선순위  | High       |

## 작업 목표

루트 `pnpm kill` 스크립트가 **node.exe 전체를 종료**하여 다른 프로젝트까지 영향을 주는 문제를 제거하고, RULE-011 포트 정책(8001~8020)에 맞춰 **현재 프로젝트 포트만 정리**하도록 제한한다.

**배경**: 개발 서버 포트 정책(RULE-011)을 도입한 이유는 “충돌 방지 + kill 단순화”인데, 현 `pnpm kill`은 프로세스 단위로 과도하게 종료해 규칙 의도와 반대로 동작한다.

**완료 기준**:

- `pnpm kill`이 더 이상 `node.exe` 전체를 종료하지 않고, **8001~8020 포트 범위의 프로세스만** 종료한다.
- `pnpm kill:port`가 실제로 프론트(8001~8010) / 백엔드(8011~8020) 개발 서버를 안정적으로 정리한다(다른 포트/프로세스는 영향 없음).
- 스크립트/문서(로드맵/아키텍처)에서 “kill” 사용 안내가 SSOT(`package.json scripts`)와 모순되지 않는다.

## 영향받는 파일

**생성**:

- 없음

**수정**:

- `package.json` - `scripts.kill`을 포트 기반 정리로 변경(필요 시 `kill:unsafe` 분리)
- (선택) `vibe/roadmap.md` - 빠른 실행의 kill 안내를 최신 동작과 정합화
- (선택) `vibe/architecture.md` - 실행/도구 SSOT 설명에서 kill 정책 주석 보강

**참조**:

- `.cursor/rules/00-core-critical.mdc` - RULE-011(포트 정책) 및 “SSOT: package.json scripts”
- `vibe/roadmap.md` - 빠른 실행/포트 정리 가이드

## 구현 흐름

### 1단계: 목표 동작(안전한 kill) 확정

- `pnpm kill`은 “프로젝트 개발 포트 정리”의 **안전한 별칭**이어야 한다.
- 포트 범위는 RULE-011을 따른다: 프론트 8001~8010, 백엔드 8011~8020.

### 2단계: 스크립트 변경

- `package.json`의 `scripts.kill`에서 `taskkill /IM node.exe` 같은 광역 종료를 제거한다.
- `kill:port`(또는 `kill:front` + `kill:back`)를 호출하도록 연결한다.
- (권장) `npx`가 설치 확인 프롬프트로 멈추지 않게 `--yes` 옵션을 고려한다(팀 표준 합의 필요).

### 3단계: 수동 검증(안전성 확인)

- 다른 프로젝트의 Node 프로세스(포트 대역 외)를 띄운 상태에서 `pnpm kill` 실행 → **영향이 없는지** 확인한다.
- `pnpm dev:front`, `pnpm dev:back` 실행 후 `pnpm kill`로 정리되는지 확인한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [RU-001[Mvp]](RU-001[Mvp].md) - 포트 정책(RULE-011) 정합화 및 `kill:port` 스크립트 기반

**다음 작업에 전달할 것**:

- 개발 중 “포트 충돌/정리” 때문에 흐름이 끊기지 않는 안정적인 실행 루틴(특히 U-007/U-008 스트리밍 개발에 유리)

## 주의사항

**기술적 고려사항**:

- kill 범위는 반드시 RULE-011 포트 대역(8001~8020)으로 제한한다(다른 프로젝트 영향 금지).
- OS/쉘 차이를 피하려면 “프로세스명 kill”보다 “포트 기반 kill”을 우선한다.

**잠재적 리스크**:

- `npx kill-port`가 환경에 따라 프롬프트로 멈출 수 있음 → `--yes` 도입 여부를 합의하고, 런북에 예외 대응(수동 kill 방법)을 남긴다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 기존 `pnpm kill`(광역 종료) 동작을 어떻게 처리할까?
  - Option A: `pnpm kill`을 안전한 포트 기반 정리로 변경하고, 광역 종료는 제거(권장: 안전)
  - Option B: `pnpm kill`은 안전하게 바꾸되, 기존 동작은 `pnpm kill:unsafe`로 분리(팀 합의 시)

## 참고 자료

- `.cursor/rules/00-core-critical.mdc` - RULE-011(포트 정책)
- `vibe/roadmap.md` - 빠른 실행/포트 정리
- `package.json` - scripts SSOT

