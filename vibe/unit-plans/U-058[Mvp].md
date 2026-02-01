# U-058[Mvp]: 핫스팟 디자인 개선 (코너/스트로크/색상)

## 메타데이터

| 항목      | 내용                  |
| --------- | --------------------- |
| Unit ID   | U-058[Mvp]            |
| Phase     | MVP                   |
| 예상 소요 | 60분                  |
| 의존성    | U-010[Mvp]            |
| 우선순위  | Medium (품질 개선)    |

## 작업 목표

핫스팟(Hotspot) 시각적 디자인을 **터미널 테마에 부합하면서도 게임 UI 수준으로 개선**하여, 사용자가 클릭 가능 영역을 직관적으로 인식하고 상호작용할 수 있게 한다.

**배경**: U-010에서 구현한 핫스팟 오버레이는 기능적으로 동작하지만, 현재 단순한 직사각형 테두리만 표시되어 "게임스러운" 시각적 품질이 부족하다. PRD 요구사항(채팅 UI 금지, 게임 UI 고정)에 맞춰 CRT 터미널 테마와 조화로운 디자인으로 개선이 필요하다.

**완료 기준**:

- 핫스팟이 코너 마커 + 얇은 스트로크 + 옅은 배경 스타일로 표시된다
- 녹색이 아닌 터미널 호환 색상(cyan/amber/magenta)으로 강조된다
- 호버/포커스 상태에서 시각적 피드백이 제공된다
- DnD 드롭 타겟으로서의 시각적 명확성이 확보된다
- 기존 bbox 좌표 규약(0~1000)이 준수된다 (RULE-009)

## 영향받는 파일

**생성**:

- `frontend/src/components/Hotspot.tsx` - 핫스팟 전용 컴포넌트 (기존 SceneCanvas 내부 로직 분리)
- `frontend/src/styles/hotspot.css` - 핫스팟 전용 스타일

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - Hotspot 컴포넌트 사용으로 리팩토링
- `frontend/src/style.css` - 전역 스타일에서 핫스팟 관련 변수 정의

**참조**:

- `vibe/ref/frontend-style-guide.md` - CRT 테마 컬러 팔레트
- `.cursor/rules/10-frontend-game-ui.mdc` - 프론트엔드 UI 규칙

## 구현 흐름

### 1단계: 컬러 팔레트 결정 및 CSS 변수 정의

- 터미널 테마 내에서 녹색이 아닌 강조 색상 선택
  - 후보: `--hotspot-primary: cyan`, `--hotspot-hover: amber`, `--hotspot-active: magenta`
- 상태별 색상 변수 정의 (default, hover, focus, disabled, drop-target)

### 2단계: 코너 마커 + 스트로크 디자인 구현

- 4개 코너에 L자 형태 브라켓/마커 SVG 또는 CSS 구현
- 전체 테두리 대신 미세한(1-2px) 외곽선으로 영역 표시
- 반투명 배경(`rgba`)으로 클릭 가능 영역 암시

### 3단계: 인터랙션 피드백 애니메이션

- 호버 시 코너 마커 미세 펄스 또는 확장 효과
- 클릭/활성화 시 글로우 강화
- DnD 드롭 타겟 진입 시 하이라이트 효과
- CSS `transition`으로 부드러운 상태 전환

### 4단계: 상태별 시각화

- 비활성화 핫스팟: 흐릿한 색상 + 점선 테두리
- 호버 상태: 색상 밝기 증가 + 코너 마커 확대
- 드롭 타겟 상태: 특별한 강조색 + 점멸 효과

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-010[Mvp]](U-010[Mvp].md) - Scene Canvas 핫스팟 오버레이 기본 구현, bbox 좌표 변환 로직
- **참조**: `frontend/src/utils/box2d.ts` - 좌표 변환 유틸 (0~1000 → px)

**다음 작업에 전달할 것**:

- CP-MVP-03: 10분 데모 루프에서 개선된 핫스팟 시각적 품질 확인
- MMP 단계에서 핫스팟에 아이콘/라벨 추가 시 이 스타일 기반 확장

## 주의사항

**기술적 고려사항**:

- (RULE-009) bbox 좌표 규약: 스타일 변경이 좌표 계산 로직에 영향을 주지 않아야 함
- (RULE-002) 채팅 UI 금지: 핫스팟이 "선택 버튼 목록"처럼 보이지 않도록 주의
- CSS 성능: 많은 핫스팟이 동시에 렌더될 때 애니메이션이 프레임 드롭을 일으키지 않도록 `will-change` 또는 GPU 가속 활용

**잠재적 리스크**:

- 색상 선택이 터미널 테마와 충돌할 수 있음 → 스타일 가이드 참조하여 일관성 유지
- 애니메이션 과다 시 게임 몰입 방해 가능 → 미세하고 절제된 효과로 제한

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 핫스팟 강조 색상 선택?
  - Option A: Cyan 계열 (시원하고 미래적, 녹색과 대비)
  - Option B: Amber/Gold 계열 (따뜻하고 경고성, 클릭 유도)
  - Option C: Magenta/Purple 계열 (신비롭고 판타지적)

- [ ] **Q2**: 코너 마커 스타일?
  - Option A: L자 브라켓 (SF/터미널 느낌)
  - Option B: 모서리 점 + 미세 선 (미니멀)
  - Option C: 스캔라인 모서리 (CRT 테마 강조)

## 참고 자료

- `vibe/ref/frontend-style-guide.md` - CRT 테마 컬러 팔레트 및 스타일 원칙
- `.cursor/rules/10-frontend-game-ui.mdc` - 프론트엔드 게임 UI 규칙
- `frontend/src/components/SceneCanvas.tsx` - 현재 핫스팟 렌더링 구현
- https://codepen.io/search/pens?q=sci-fi%20ui%20corner - SF UI 코너 마커 영감
