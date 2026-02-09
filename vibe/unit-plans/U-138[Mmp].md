# U-138[Mmp]: 공개 저장소 이전 + 불필요 파일 정리 (Public Repo Migration)

## 메타데이터

| 항목      | 내용                                                         |
| --------- | ------------------------------------------------------------ |
| Unit ID   | U-138[Mmp]                                                   |
| Phase     | MMP                                                          |
| 예상 소요 | 45분                                                         |
| 의존성    | None (MVP 완료 기반, U-119/U-120과 병렬 가능)               |
| 우선순위  | ⚡ Critical (제출 필수: 공개 코드 저장소)                    |

## 작업 목표

Devpost 제출 요건인 **"공개 코드 저장소(Public Code Repo)"**를 확보하기 위해, 현재 비공개 저장소의 소스코드를 **공개 GitHub 저장소로 이전**하고, 이전 과정에서 **비밀정보·불필요한 파일·개발 내부 산출물을 정리**한다.

**배경**: Devpost 심사 기준 Technical Execution(40%)에서 _"Quality of the code, architecture, and technical implementation"_ 을 평가하며, 제출 시 **공개 코드 저장소 링크**가 필수 항목이다. 현재 저장소는 비공개(private)이며, 다음 파일들이 공개에 부적합할 수 있다:
- `vibe/` 폴더(418개 파일): 내부 개발 계획서·런북·결과 보고서·로드맵 등 개발 프로세스 문서
- `.cursor/`, `.gemini/`, `.claude/`: AI 에이전트 규칙·커맨드 (개발 방법론)
- `test-screenshots/`: 개발용 스크린샷
- Git 히스토리: `.env` 실제 값, 서비스 계정 키 등이 과거 커밋에 포함되었을 가능성

**완료 기준**:

- GitHub **공개(public) 저장소**가 생성되어 접근 가능
- 저장소에 **비밀정보(API 키, 서비스 계정, .env 실값)가 존재하지 않음** (현재 파일 + Git 히스토리)
- **불필요한 파일 제거**: 개발 내부 산출물, 테스트 스크린샷, 생성된 이미지, 임시 파일
- `.gitignore` 갱신: 공개 저장소에 적합한 패턴 보강
- `.env.example` 파일이 프론트엔드/백엔드에 존재하여 설정 방법을 안내
- 공개 저장소에서 `git clone` → 빌드/실행 가능 (README 참조)
- 코드 구조가 정리되어 **심사자가 핵심 코드를 쉽게 탐색** 가능

## 영향받는 파일

**삭제 (제거 대상)**:

- `test-screenshots/` — 개발용 스크린샷 (4개 PNG, 공개 불필요)
- `vibe/unit-results/` — 유닛 완료 보고서 (내부 프로세스 산출물)
- `vibe/unit-runbooks/` — 유닛 런북 (내부 검증 절차)
- `vibe/ready/` — 로드맵 생성 프롬프트 (내부 도구)
- `vibe/commands-temp.md` — 임시 파일
- `vibe/ref/*.png` — 내부 참조 이미지
- `scripts/kill-nuke.sh`, `scripts/kill-zombies.sh` — 로컬 개발 유틸리티
- `NUL` — Windows 아티팩트 (gitignore에 있으나 확인)

**수정**:

- `.gitignore` — 공개 저장소 대비 패턴 보강 (대량 vibe 파일, 스크린샷 등)
- `backend/.env.example` — 필수 환경변수 목록 + placeholder 값 확인
- `frontend/.env.example` — (있다면) 동일 확인

**유지 (공개 가치 있음)**:

- `vibe/prd.md` — 제품 기획 (심사자에게 개발 의도 전달)
- `vibe/tech-stack.md` — 기술 스택 결정 근거
- `vibe/roadmap.md` — 개발 로드맵 (프로젝트 관리 역량 시연)
- `vibe/debt-log.md` — 기술 부채 관리 (개발 성숙도 시연)
- `vibe/changelog.md` — 변경 이력
- `vibe/unit-plans/` — 유닛 계획서 (개발 방법론 시연, 선택적)
- `.cursor/rules/`, `.gemini/rules/`, `.claude/` — AI 에이전트 규칙 (AI 활용 방법론 시연)
- `CLAUDE.md` — AI 에이전트 전역 지침 (AI 개발 프로세스 시연)
- `shared/` — 스키마 SSOT

**참조**:

- Devpost 제출 요건: "Public Code Repo" + "Quality of the code"
- `vibe/tech-stack.md` — 기술 스택 버전
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
  rg -i "AIza[0-9A-Za-z_-]{35}" --type py --type ts --type tsx
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

  # Option B: BFG Repo Cleaner (대안)
  bfg --delete-files "viilab-dev-*.json"
  bfg --delete-files ".env"
  ```
- **비밀정보가 없는 경우**: 히스토리 정리 생략 (커밋 히스토리 보존이 심사에 유리)

### 3단계: 불필요 파일 정리

- **삭제 대상 파일 제거**:
  ```bash
  # 개발 내부 산출물
  rm -rf test-screenshots/
  rm -rf vibe/unit-results/
  rm -rf vibe/unit-runbooks/
  rm -rf vibe/ready/
  rm -f vibe/commands-temp.md

  # 내부 참조 이미지 (불필요한 것만)
  # vibe/ref/*.png 중 공개 가치 없는 것 선별 삭제

  # 로컬 전용 스크립트
  rm -f scripts/kill-nuke.sh scripts/kill-zombies.sh
  ```
- **`.gitignore` 보강**:
  ```gitignore
  # Public repo exclusions
  test-screenshots/
  vibe/unit-results/
  vibe/unit-runbooks/
  vibe/ready/
  ```
- **빈 디렉토리 정리**: `find . -type d -empty -delete`

### 4단계: 코드 정리 및 구조 확인

- 불필요한 `console.log`, `print()` 디버그 문 정리 (핵심 코드만)
- import 정리 (사용하지 않는 import 제거)
- 코드 내 한국어 주석 중 불필요한 것 정리 (영문 심사자 고려)
- 파일/폴더 구조가 직관적인지 확인:
  ```
  unknown-world/
  ├── frontend/        # React 19 + Vite 7
  ├── backend/         # FastAPI + Python 3.14
  ├── shared/          # Schema SSOT (JSON)
  ├── vibe/            # Development docs (PRD, roadmap, etc.)
  ├── .cursor/         # AI agent rules (Cursor)
  ├── .gemini/         # AI agent rules (Gemini)
  ├── CLAUDE.md        # AI global guidelines
  ├── README.md        # (U-121에서 작성)
  └── docker-compose.yml  # (U-120에서 생성)
  ```

### 5단계: 공개 저장소 생성 및 푸시

- **Option A (현재 저장소 공개 전환)**:
  ```bash
  # GitHub Settings → Danger Zone → Change visibility → Public
  ```
  - 장점: 전체 커밋 히스토리 보존 (개발 과정 시연)
  - 조건: 2단계에서 히스토리가 깨끗함이 확인된 경우

- **Option B (새 공개 저장소 생성 + 클린 푸시)**:
  ```bash
  # 새 공개 저장소 생성
  gh repo create unknown-world-public --public --description "Unknown World - AI Agent-driven Infinite Roguelike Narrative Game"

  # 정리된 코드 푸시
  git remote add public https://github.com/{user}/unknown-world-public.git
  git push public main
  ```
  - 장점: 완전한 비밀정보 격리
  - 단점: 커밋 히스토리 일부 손실 가능 (filter-repo 사용 시)

- **Option C (orphan 브랜치로 클린 스냅샷)**:
  ```bash
  git checkout --orphan public-release
  git add -A
  git commit -m "Initial public release for Gemini 3 Hackathon"
  gh repo create unknown-world --public
  git push -u origin public-release:main
  ```
  - 장점: 히스토리 완전 제거 (가장 안전)
  - 단점: 커밋 히스토리 없음

### 6단계: 공개 저장소 검증

- 시크릿 모드 브라우저에서 공개 저장소 URL 접근 확인
- 저장소 내 비밀정보 없음 확인:
  ```bash
  # GitHub Secret Scanning이 활성화되어 있는지 확인
  # 또는 수동으로 grep
  git clone {public-repo-url} /tmp/verify
  cd /tmp/verify
  rg -i "AIza|GOOG|private_key|client_secret" --type-not md
  ```
- `git clone` → `pnpm install` → `pnpm -C frontend build` 정상 확인
- `uv sync` → `uv run pytest` 정상 확인 (skip된 테스트 제외)
- 코드 탐색 시 직관적인 구조인지 최종 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **MVP 전체**: 정리 대상인 프론트+백엔드 소스코드
- **U-126[Mvp]**: 성능 최적화 + 기술 부채 해소 완료된 코드 (정리된 상태)
- **debt-log.md**: 미해결 부채 현황 (공개 시 투명성)

**다음 작업에 전달할 것**:

- **U-121[Mmp]**: 공개 저장소 URL → README에 포함, README를 공개 저장소에 커밋
- **U-122[Mmp]**: 데모 영상에서 공개 저장소 링크 언급
- **CP-SUB-01**: 제출 체크포인트의 "공개 코드 저장소" 항목 충족

## 주의사항

**기술적 고려사항**:

- (RULE-007) **비밀정보 유출은 절대 금지** — 공개 전 반드시 히스토리 포함 전수 감사
- (Devpost) "Public Code Repo" 요건: 심사자가 코드를 직접 확인 가능해야 함
- (Devpost) Technical Execution(40%): 코드 품질, 아키텍처, 기술 구현을 평가하므로 **코드 구조가 직관적**이어야 함
- `vibe/` 문서 유지 결정: 해커톤에서 개발 프로세스(로드맵, 유닛 계획, 부채 관리)를 보여주면 **개발 성숙도를 시연**하는 효과. 단, 너무 많은 파일은 탐색을 방해할 수 있으므로 핵심 문서만 유지
- `.cursor/`, `.gemini/`, `.claude/` 유지: AI 에이전트를 활용한 개발 방법론 자체가 **Gemini 해커톤의 Innovation 포인트**가 될 수 있음
- Git 히스토리 보존 vs 클린 스냅샷: 히스토리가 있으면 개발 과정이 보이지만, 비밀정보 위험도 있음 → 감사 결과에 따라 결정

**잠재적 리스크**:

- Git 히스토리에 비밀정보가 포함된 경우 `filter-repo` 실행이 필요하며, force push로 히스토리가 재작성됨 → **원본 저장소 백업 필수**
- 파일 삭제 시 아직 참조되는 파일을 제거할 수 있음 → 삭제 전 `rg` 또는 `grep`으로 참조 확인
- 공개 전환 후 비밀정보 발견 시 GitHub Secret Scanning 알림이 올 수 있음 → 사전 감사로 방지
- README가 아직 없는 상태에서 공개하면 첫인상 저하 → U-121(문서)과 가능하면 동시 또는 직후 진행 권장

## 삭제/유지 판단 기준 요약

| 대상                     | 판단 | 근거                                                   |
|--------------------------|------|--------------------------------------------------------|
| `test-screenshots/`      | 삭제 | 개발용 스크린샷, 공개 가치 없음                        |
| `vibe/unit-results/`     | 삭제 | 내부 완료 보고서, 418개 중 ~133개 (과다)               |
| `vibe/unit-runbooks/`    | 삭제 | 내부 검증 런북, 심사자에게 불필요                      |
| `vibe/ready/`            | 삭제 | 로드맵 생성 프롬프트, 내부 도구                        |
| `vibe/ref/*.png`         | 선별 | 참조 이미지 중 이슈 재현용은 삭제, 아키텍처용은 유지   |
| `scripts/kill-*.sh`      | 삭제 | 로컬 프로세스 관리 유틸, 공개 불필요                   |
| `vibe/prd.md`            | 유지 | 제품 기획 (개발 의도 전달)                             |
| `vibe/tech-stack.md`     | 유지 | 기술 스택 결정 (Technical Execution 가점)              |
| `vibe/roadmap.md`        | 유지 | 프로젝트 관리 (개발 성숙도 시연)                       |
| `vibe/unit-plans/`       | 유지 | 유닛 계획 방법론 (AI 개발 프로세스 시연)               |
| `vibe/changelog.md`      | 유지 | 변경 이력 (투명성)                                     |
| `vibe/debt-log.md`       | 유지 | 기술 부채 관리 (성숙도)                                |
| `.cursor/`, `.gemini/`   | 유지 | AI 에이전트 활용 방법론 (Innovation 포인트)            |
| `CLAUDE.md`              | 유지 | AI 전역 지침 (개발 방법론)                             |
| `shared/`                | 유지 | 스키마 SSOT (아키텍처 품질)                            |

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 공개 저장소 생성 방식은?
  - Option A: **현재 저장소를 Public 전환** (히스토리 보존, 감사 통과 시)
  - Option B: **새 저장소 생성 + 클린 푸시** (안전, 히스토리 유지)
  - Option C: **orphan 브랜치 스냅샷** (가장 안전, 히스토리 없음)

- [ ] **Q2**: `vibe/unit-plans/` (유닛 계획서 ~138개) 포함 여부는?
  - Option A: **전체 유지** (개발 방법론 시연, 투명성 극대화)
  - Option B: **핵심 5~10개만 유지** (대표 유닛만 선별, 탐색 편의)
  - Option C: **전체 삭제** (코드에만 집중, 최소 구조)

- [ ] **Q3**: `vibe/ref/*.png` (내부 참조 이미지) 처리는?
  - Option A: **전체 삭제** (내부 이슈 재현 이미지, 공개 불필요)
  - Option B: **아키텍처/UX 관련만 유지** (심사자에게 유용한 것만)

## 참고 자료

- Devpost 제출 요건: "Public Code Repo" + "Quality of the code, architecture, and technical implementation"
- Devpost 심사 기준: Technical Execution(40%), Innovation/Wow(30%)
- `.cursor/rules/00-core-critical.mdc` — RULE-007 (비밀정보 커밋 금지)
- [GitHub: Making a repository public](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [git-filter-repo](https://github.com/newren/git-filter-repo) — Git 히스토리 정리 도구
- [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) — 대안 히스토리 정리 도구
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning) — 공개 전환 시 자동 감지
