# U-138[Mmp]: 공개 저장소 준비 통합 — 레포 이전 + 문서 영문화 + 파일 정리

## 메타데이터

| 항목      | 내용                                                         |
| --------- | ------------------------------------------------------------ |
| Unit ID   | U-138[Mmp]                                                   |
| Phase     | MMP                                                          |
| 예상 소요 | 60분                                                         |
| 의존성    | None (MVP 완료 기반, U-119와 병렬 가능)                     |
| 우선순위  | ⚡ Critical (제출 필수: 공개 코드 저장소, **U-120 배포 전 완료 필수**) |

## 작업 목표

Devpost 제출 요건인 **"공개 코드 저장소(Public Code Repo)"**를 확보하기 위해, 현재 비공개 저장소의 소스코드를 **이미 생성된 공개 GitHub 저장소(`Yachaboom/unknown-world-public`)로 이전**하고, 이전 과정에서 **비밀정보 감사·불필요 파일 정리·핵심 문서 영문화·`docs/` 폴더 구성**을 수행한다. **정리된 공개 레포 버전으로 U-120에서 배포**하므로 U-120보다 먼저 완료되어야 한다.

**배경**: Devpost 심사 기준 Technical Execution(40%)에서 _"Quality of the code, architecture, and technical implementation"_ 을 평가하며, 제출 시 **공개 코드 저장소 링크**가 필수 항목이다. 현재 저장소는 비공개(private)이며, 다음 사항이 공개 전 해결되어야 한다:
- `vibe/` 폴더(418개 파일): 내부 개발 계획서·런북·결과 보고서·로드맵 등 — **prd, tech-stack, architecture만 영문화하여 `docs/`로 이동**, 나머지 삭제
- `.cursor/`, `.gemini/`, `.claude/`: AI 에이전트 규칙·커맨드 (내부 개발 도구)
- `test-screenshots/`: 개발용 스크린샷
- Git 히스토리: `.env` 실제 값, 서비스 계정 키 등이 과거 커밋에 포함되었을 가능성
- **공개 저장소**: https://github.com/Yachaboom/unknown-world-public.git (빈 레포, 이미 생성됨)

**완료 기준**:

- GitHub 공개 저장소(`https://github.com/Yachaboom/unknown-world-public`)에 코드가 푸시되어 접근 가능
- 저장소에 **비밀정보(API 키, 서비스 계정, .env 실값)가 존재하지 않음** (현재 파일 + Git 히스토리)
- `docs/` 폴더에 **영문화된** `prd.md`, `tech-stack.md`, `architecture.md`가 존재
- `vibe/` 폴더 및 기타 내부 산출물이 제거되어 심사자에게 깔끔한 구조 제공
- `.gitignore` 갱신: 공개 저장소에 적합한 패턴 보강
- `.env.example` 파일이 프론트엔드/백엔드에 존재하여 설정 방법을 안내
- `git remote` origin이 공개 저장소 URL로 설정됨
- 공개 저장소에서 `git clone` → 빌드/실행 가능 (README 참조)
- 코드 구조가 정리되어 **심사자가 핵심 코드를 쉽게 탐색** 가능

## 영향받는 파일

**생성**:

- `docs/prd.md` — PRD 영문화 버전 (vibe/prd.md 원본 기반)
- `docs/tech-stack.md` — 기술 스택 영문화 버전 (vibe/tech-stack.md 원본 기반)
- `docs/architecture.md` — 아키텍처 문서 영문화 버전 (vibe/architecture.md 원본 기반)

**삭제 (제거 대상)**:

- `vibe/` 폴더 전체 — 내부 개발 산출물 (unit-plans, unit-results, unit-runbooks, roadmap, changelog, commands, ref, ready, debt-log 등)
- `test-screenshots/` — 개발용 스크린샷 (4개 PNG, 공개 불필요)
- `.cursor/` — AI 에이전트 규칙 (내부 개발 도구)
- `.gemini/` — AI 에이전트 규칙 (내부 개발 도구)
- `.claude/` — AI 에이전트 설정 (내부 개발 도구)
- `CLAUDE.md` — AI 에이전트 전역 지침 (내부 개발 도구)
- `scripts/kill-nuke.sh`, `scripts/kill-zombies.sh` — 로컬 개발 유틸리티
- `NUL` — Windows 아티팩트

**수정**:

- `.gitignore` — 공개 저장소 대비 패턴 보강 (vibe/, test-screenshots/ 등)
- `backend/.env.example` — 필수 환경변수 목록 + placeholder 값 확인
- `frontend/.env.example` — (있다면) 동일 확인
- `.git/config` — origin remote를 공개 저장소 URL로 변경

**참조**:

- Devpost 제출 요건: "Public Code Repo" + "Quality of the code"
- `vibe/prd.md`, `vibe/tech-stack.md`, `vibe/architecture.md` — 영문화 원본
- `.cursor/rules/00-core-critical.mdc` — RULE-007 (Secret 커밋 금지)

## 구현 흐름

### 1단계: 비밀정보 감사 (Security Audit)

- Git 히스토리에서 비밀정보 유출 여부 확인:
  ```bash
  # 과거 커밋에 .env 실값, 서비스 계정 키 등이 포함되었는지 검색
  git log --all --full-history -- "**/.env" "**/service-account*.json" "**/credentials*.json"
  git log --all --full-history -- "backend/viilab-dev-b43137729c78.json"
  ```
- 현재 파일에서 하드코딩된 API 키/토큰 검색:
  ```bash
  rg -i "AIza[0-9A-Za-z_-]{35}" --type py --type ts
  rg -i "GOOGLE_API_KEY\s*=" --type py --type ts
  ```
- `.env.example` 파일에 실제 값이 아닌 placeholder만 있는지 확인
- 결과에 따라 2단계에서 히스토리 정리 여부 결정

### 2단계: Git 히스토리 정리 (필요 시)

- **비밀정보가 히스토리에 있는 경우**:
  ```bash
  # Option A: git filter-repo (권장)
  pip install git-filter-repo
  git filter-repo --path backend/viilab-dev-b43137729c78.json --invert-paths
  git filter-repo --path .env --invert-paths
  ```
- **비밀정보가 없는 경우**: 히스토리 정리 생략 (커밋 히스토리 보존이 심사에 유리)

### 3단계: 핵심 문서 영문화 + `docs/` 폴더 구성

- `vibe/prd.md`, `vibe/tech-stack.md`, `vibe/architecture.md` 3개 문서를 **영문 번역**:
  - 기술 용어/고유명사(Gemini, Structured Outputs, Vertex AI, WorldState 등)는 원문 유지
  - 한국어 원본의 핵심 내용을 빠짐없이 전달
  - 심사자가 프로젝트의 설계 의도, 기술 선택 근거, 아키텍처를 이해할 수 있도록 구성
- 번역된 문서를 `docs/` 폴더에 배치:
  ```bash
  mkdir -p docs
  # 번역된 내용으로 docs/prd.md, docs/tech-stack.md, docs/architecture.md 생성
  ```
- 참고: architecture.md는 ~970줄으로 분량이 크므로, 핵심 섹션(시스템 개요, 계층 구조, 데이터 흐름, 주요 컴포넌트)을 우선 번역하고 상세 구현 참조는 코드 자체로 대체 가능

### 4단계: 불필요 파일 정리 + `.gitignore` 보강

- **삭제 대상 파일 제거**:
  ```bash
  # 내부 개발 산출물 전체
  rm -rf vibe/
  rm -rf test-screenshots/

  # AI 에이전트 내부 도구
  rm -rf .cursor/
  rm -rf .gemini/
  rm -rf .claude/
  rm -f CLAUDE.md

  # 로컬 전용 스크립트
  rm -f scripts/kill-nuke.sh scripts/kill-zombies.sh

  # Windows 아티팩트
  rm -f NUL
  ```
- **`.gitignore` 보강**:
  ```gitignore
  # Internal development artifacts (excluded from public repo)
  vibe/
  test-screenshots/
  .cursor/
  .gemini/
  .claude/
  CLAUDE.md
  ```
- **코드 정리** (선택):
  - 불필요한 `console.log`, `print()` 디버그 문 정리 (핵심 코드만)
  - 코드 내 한국어 주석 중 불필요한 것 정리 (영문 심사자 고려)
  - import 정리 (사용하지 않는 import 제거)

### 5단계: Origin 전환 + 공개 저장소 푸시

- **origin remote 변경**:
  ```bash
  # 기존 origin을 private-origin으로 백업
  git remote rename origin private-origin

  # 공개 저장소를 새 origin으로 설정
  git remote add origin https://github.com/Yachaboom/unknown-world-public.git

  # 정리된 코드를 공개 저장소에 푸시
  git add -A
  git commit -m "chore: prepare public repo for hackathon submission"
  git push -u origin main
  ```
- 푸시 후 GitHub에서 공개 접근 확인
- 이후 U-120 배포, U-121 README 등은 이 공개 레포 기반으로 작업

### 6단계: 공개 저장소 검증

- 시크릿 모드 브라우저에서 공개 저장소 URL 접근 확인
- 저장소 내 비밀정보 없음 확인:
  ```bash
  git clone https://github.com/Yachaboom/unknown-world-public.git /tmp/verify
  cd /tmp/verify
  rg -i "AIza|GOOG|private_key|client_secret" --type-not md
  ```
- `git clone` → `pnpm install` → `pnpm -C frontend build` 정상 확인
- `uv sync` → 서버 실행 정상 확인
- 코드 구조가 직관적인지 최종 확인:
  ```
  unknown-world-public/
  ├── frontend/           # React 19 + Vite 7
  ├── backend/            # FastAPI + Python 3.14
  ├── shared/             # Schema SSOT (JSON)
  ├── docs/               # PRD, Tech Stack, Architecture (English)
  │   ├── prd.md
  │   ├── tech-stack.md
  │   └── architecture.md
  ├── README.md           # (U-121에서 작성)
  └── docker-compose.yml  # (U-120에서 생성)
  ```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **MVP 전체**: 정리 대상인 프론트+백엔드 소스코드
- **U-126[Mvp]**: 성능 최적화 + 기술 부채 해소 완료된 코드 (정리된 상태)
- **vibe/prd.md, vibe/tech-stack.md, vibe/architecture.md**: 영문화 원본 문서

**다음 작업에 전달할 것**:

- **U-120[Mmp]**: 정리된 공개 레포를 기반으로 배포 (**U-120의 선행 의존성**)
- **U-121[Mmp]**: 공개 저장소 URL (`https://github.com/Yachaboom/unknown-world-public`) → README에 포함, README를 공개 저장소에 커밋
- **U-122[Mmp]**: 데모 영상에서 공개 저장소 링크 언급
- **CP-SUB-01**: 제출 체크포인트의 "공개 코드 저장소" 항목 충족

## 주의사항

**기술적 고려사항**:

- (RULE-007) **비밀정보 유출은 절대 금지** — 공개 전 반드시 히스토리 포함 전수 감사
- (Devpost) "Public Code Repo" 요건: 심사자가 코드를 직접 확인 가능해야 함
- (Devpost) Technical Execution(40%): 코드 품질, 아키텍처, 기술 구현을 평가하므로 **코드 구조가 직관적**이어야 함
- 문서 영문화 시 기술 용어(Gemini, Structured Outputs, Vertex AI, WorldState 등)는 원문 유지
- `docs/` 폴더에 영문 문서를 배치함으로써 심사자가 프로젝트 배경을 쉽게 이해 가능
- U-120(배포)이 이 작업 완료 후 진행되므로, origin 전환 + 코드 정리가 배포 스크립트와 호환되어야 함
- `architecture.md`는 ~970줄으로 분량이 크므로, 핵심 섹션 우선 번역 + 상세 구현은 코드 참조로 대체

**잠재적 리스크**:

- Git 히스토리에 비밀정보가 포함된 경우 `filter-repo` 실행이 필요하며, force push로 히스토리가 재작성됨 → **원본 저장소 백업 필수** (private-origin으로 보존)
- 문서 영문화 품질이 심사에 영향 → 기술 문서이므로 정확성 우선, 자연스러움은 차선
- origin 전환 후 기존 private remote 접근이 필요할 수 있음 → `private-origin` 별칭으로 보존
- 파일 삭제 시 아직 참조되는 파일을 제거할 수 있음 → 삭제 전 참조 확인
- README가 아직 없는 상태에서 공개하면 첫인상 저하 → U-121(문서)을 직후 진행 권장

## 삭제/유지 판단 기준 요약

| 대상                     | 판단       | 근거                                                   |
|--------------------------|------------|--------------------------------------------------------|
| `vibe/prd.md`            | 영문화→docs/ | 심사자에게 프로젝트 배경 전달 (핵심 문서)            |
| `vibe/tech-stack.md`     | 영문화→docs/ | 기술 스택 결정 근거 (Technical Execution 가점)       |
| `vibe/architecture.md`   | 영문화→docs/ | 아키텍처 설계 (Technical Execution 가점)             |
| `vibe/` (나머지 전체)    | 삭제       | 내부 개발 프로세스 산출물, 심사자에게 불필요          |
| `test-screenshots/`      | 삭제       | 개발용 스크린샷, 공개 가치 없음                      |
| `.cursor/`, `.gemini/`   | 삭제       | 내부 AI 에이전트 도구, 공개 불필요                   |
| `.claude/`, `CLAUDE.md`  | 삭제       | 내부 AI 에이전트 지침, 공개 불필요                   |
| `scripts/kill-*.sh`      | 삭제       | 로컬 프로세스 관리 유틸, 공개 불필요                 |
| `frontend/`, `backend/`  | 유지       | 핵심 소스코드                                        |
| `shared/`                | 유지       | 스키마 SSOT (아키텍처 품질)                          |
| `docs/` (신규)           | 생성       | 영문화된 핵심 문서 3종                               |

## 페어링 질문 (결정 필요)

- [x] **Q1**: 공개 저장소 생성 방식은? → **결정됨: 기존 생성된 빈 공개 레포(`Yachaboom/unknown-world-public`)로 origin 변경 후 푸시**
- [x] **Q2**: `vibe/` 폴더 처리는? → **결정됨: prd, tech-stack, architecture만 영문화 → `docs/` 이동, 나머지 전체 삭제**
- [ ] **Q3**: `.cursor/`, `.gemini/`, `.claude/`, `CLAUDE.md` 처리는?
  - Option A: **전체 삭제** (코드에만 집중, 깔끔한 구조) → 권장
  - Option B: **유지** (AI 에이전트 활용 방법론 시연, Innovation 포인트)
  - _현재 계획: Option A (삭제) 기준으로 구현 흐름 작성됨. 유지 시 .gitignore 패턴 수정 필요._

## 참고 자료

- 공개 저장소: https://github.com/Yachaboom/unknown-world-public.git (빈 레포, 이미 생성됨)
- Devpost 제출 요건: "Public Code Repo" + "Quality of the code, architecture, and technical implementation"
- Devpost 심사 기준: Technical Execution(40%), Innovation/Wow(30%)
- `.cursor/rules/00-core-critical.mdc` — RULE-007 (비밀정보 커밋 금지)
- [git-filter-repo](https://github.com/newren/git-filter-repo) — Git 히스토리 정리 도구
- [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) — 대안 히스토리 정리 도구
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning) — 공개 전환 시 자동 감지
