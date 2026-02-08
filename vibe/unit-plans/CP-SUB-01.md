# CP-SUB-01: 해커톤 제출 완료 체크포인트

## 메타데이터

| 항목      | 내용                                              |
| --------- | ------------------------------------------------- |
| Unit ID   | CP-SUB-01                                         |
| Phase     | MMP                                               |
| 예상 소요 | 15분                                              |
| 의존성    | U-119, U-120, U-121, U-122                        |
| 우선순위  | ⚡ Critical (마감: 2026-02-09 5PM PST / KST 2/10 화 10AM, D-2) |

## 작업 목표

**Devpost Gemini 3 Hackathon** 제출 요건을 모두 충족했는지 최종 점검하고, **제출을 완료**한다.

**배경**: 해커톤 마감은 2026-02-09 5:00 PM PST. 제출 후 수정이 불가하므로, 이 체크포인트에서 모든 요건을 한 번에 점검한다.

## 제출 완료 체크리스트

### Devpost 필수 요건

- [ ] **공개 데모 링크** (U-120): 로그인/결제 없이 게임 플레이 가능한 URL
- [ ] **공개 코드 저장소** (U-121): GitHub 레포가 Public이고, README.md 포함
- [ ] **Gemini Integration 텍스트** (U-121): ~200 words, 영문, Devpost 폼에 입력
- [ ] **데모 영상** (U-122): YouTube/Vimeo에 공개, 3분 이내, 영어/영어자막
- [ ] **Devpost 제출 폼**: 모든 필수 필드 입력 완료

### 기능 동작 확인

- [ ] **영어 지원**: en-US 모드에서 프로필 선택 → 턴 진행 → Action Deck → Economy → 정상
- [ ] **프로필 즉시 시작**: 로그인 없이 데모 프로필 선택으로 즉시 게임 시작
- [ ] **핵심 플로우**: 텍스트 스트리밍 + 이미지 생성 + Agent Console 단계 표시
- [ ] **경제 시스템**: Signal/Shard 비용 노출 + 잔액 변화 + 거래 장부
- [ ] **리셋**: Reset 버튼으로 프로필 선택 화면 복귀

### 보안/품질 확인

- [ ] **API 키/Secret**: 코드/로그/UI/영상에 노출 안 됨
- [ ] **프롬프트 원문**: UI/로그에 노출 안 됨
- [ ] **영상 내용**: 부적절한 콘텐츠 없음
- [ ] **Hard Gate**: Schema OK + Economy OK + Safety OK 배지 정상

### 최종 제출

- [ ] Devpost 제출 폼 제출 (Submit)
- [ ] 제출 확인 이메일/알림 수신
- [ ] 팀 멤버 모두 Devpost 프로젝트에 추가됨

## 영향받는 파일

**참조**:

- `README.md` - 프로젝트 소개 (U-121)
- `docs/gemini-integration.md` - Gemini Integration 텍스트 (U-121)
- `docs/demo-script.md` - 데모 시나리오 (U-122)
- Devpost 제출 페이지: https://gemini3.devpost.com/

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **U-119[Mmp]**: 다듬어진 프론트엔드 UI
- **U-120[Mmp]**: 공개 배포 URL
- **U-121[Mmp]**: 제출 문서 패키지 (README + 아키텍처 + Write-up)
- **U-122[Mmp]**: 데모 영상 YouTube URL

**다음 작업에 전달할 것**:

- 해커톤 제출 완료 → M6(품질 강화/후속) 진행 기반

## 주의사항

- Devpost 마감 시간은 **2026-02-09 5:00 PM PST** (**한국시간 2/10 화요일 10:00 AM KST, D-2**)
- 제출 후 수정 불가 → 제출 전 모든 항목 점검 필수
- YouTube 영상 업로드 후 HD 인코딩에 시간 소요 → **최소 2시간 전 업로드** 권장
- 공개 데모가 다운되면 심사 불가 → **제출 기간 동안 서비스 유지** 확인

## 참고 자료

- Devpost Gemini 3 Hackathon: https://gemini3.devpost.com/
- Devpost 제출 요건/심사 기준: https://gemini3.devpost.com/rules
