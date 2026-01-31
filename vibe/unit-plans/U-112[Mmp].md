# U-112[Mmp]: Panel Corner 이미지 방향 수정

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-112[Mmp] |
| Phase     | MMP        |
| 예상 소요 | 30분       |
| 의존성    | U-032[Mvp] |
| 우선순위  | Low        |

## 작업 목표

`panel-corner-br.png` 이미지가 **이미지 방향과 안맞게 쓰여 식별성을 해치는 부분을 수정**하여, UI Chrome 에셋의 일관성과 가독성을 개선한다.

**배경**: 현재 `frontend/public/ui/chrome/panel-corner-br.png`가 의도된 방향(bottom-right)과 다르게 보이거나, 다른 코너 에셋과 스타일이 불일치하여 패널 프레임의 식별성이 저하된다. 참고 이미지(`vibe/ref/sample/edge-01.png`, `edge-02.png`)를 기준으로 방향과 스타일을 맞춘다.

**완료 기준**:

- `panel-corner-br.png`가 올바른 방향(bottom-right)으로 수정된다
- 다른 코너 에셋(존재하는 경우)과 시각적 일관성이 유지된다
- 수정된 에셋이 실제 UI에서 패널 프레임에 올바르게 적용되어 보인다
- 에셋 매니페스트/체크리스트가 업데이트된다 (필요 시)

## 영향받는 파일

**생성**:

- 없음 (기존 에셋 수정)

**수정**:

- `frontend/public/ui/chrome/panel-corner-br.png` - 방향 수정 또는 재생성
- `frontend/public/ui/README.md` - 에셋 변경 이력 기록 (선택적)

**참조**:

- `vibe/ref/sample/edge-01.png` - 참고 이미지 (방향/스타일 기준)
- `vibe/ref/sample/edge-02.png` - 참고 이미지 (방향/스타일 기준)
- `vibe/unit-plans/U-032[Mvp].md` - UI Chrome Pack 계획서
- `vibe/ref/nanobanana-mcp.md` - 에셋 제작 가이드

## 구현 흐름

### 1단계: 현황 분석

- 현재 `panel-corner-br.png`의 시각적 방향 확인
- 참고 이미지(`edge-01.png`, `edge-02.png`)와 비교하여 문제점 파악
- 다른 코너 에셋(bl, tl, tr)이 있다면 함께 확인

### 2단계: 에셋 수정/재생성

- 방향 수정만으로 해결 가능하면: 이미지 편집 도구로 회전/반전
- 재생성이 필요하면: nanobanana mcp 가이드에 따라 새로 제작
  - 배경 순백(#FFFFFF) 단색으로 생성
  - 필요 시 rembg로 배경 제거
  - CRT 톤과 어울리는 색상 사용

### 3단계: UI 적용 확인

- 수정된 에셋을 `frontend/public/ui/chrome/`에 저장
- 로컬 개발 서버에서 패널 프레임 렌더링 확인
- 다른 코너와 시각적 일관성 확인

### 4단계: 문서 업데이트

- `frontend/public/ui/README.md`에 변경 이력 기록 (선택적)
- 에셋 매니페스트 체크리스트 통과 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-032[Mvp]](U-032[Mvp].md) - UI Chrome Pack(패널/카드 프레임/코너) 계획 및 결과

**다음 작업에 전달할 것**:

- 없음 (독립적인 에셋 수정 유닛)

## 주의사항

**기술적 고려사항**:

- (RULE-006) nanobanana mcp로 재생성 시 용어/스타일 SSOT 준수
- 에셋 크기/용량 예산 유지 (아이콘: 20KB 이하, 전체 1MB 이하)
- 투명 배경이 필요하면 rembg로 배경 제거

**잠재적 리스크**:

- 방향 수정만으로 해결되지 않으면 재생성 필요 → 소요 시간 증가 가능

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 다른 코너 에셋(bl, tl, tr)도 함께 점검/수정할까?
  - Option A: br만 수정 (최소 범위)
  - Option B: 전체 코너 에셋 일괄 점검/정합화
  **A1**: (구현 시 결정)

## 참고 자료

- `vibe/ref/sample/edge-01.png` - 참고 이미지
- `vibe/ref/sample/edge-02.png` - 참고 이미지
- `vibe/ref/nanobanana-mcp.md` - 에셋 제작 가이드
- `frontend/public/ui/README.md` - 에셋 워크플로우/체크리스트
