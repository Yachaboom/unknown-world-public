# U-115[Mvp]: 핫스팟 컴팩트 원형(Circle) 디자인 + 1~3개 제한 생성 + 우선순위/겹침 방지

> **상태: DONE** — 결과: [`vibe/unit-results/U-115[Mvp].md`](../unit-results/U-115[Mvp].md) | 런북: [`vibe/unit-runbooks/U-115-hotspot-circle-runbook.md`](../unit-runbooks/U-115-hotspot-circle-runbook.md)

## 메타데이터

| 항목      | 내용                                                     |
| --------- | -------------------------------------------------------- |
| Unit ID   | U-115[Mvp]                                               |
| Phase     | MVP                                                      |
| 예상 소요 | 60분                                                     |
| 의존성    | U-090[Mvp], U-087[Mvp], U-116[Mvp]                      |
| 우선순위  | High (핫스팟 UX 품질 완성, 핫스팟 관련 최종 유닛)        |

## 작업 목표

정밀분석으로 생성되는 핫스팟을 **오브젝트 중앙의 컴팩트한 원형(circle)**으로 표현하고, **한 번에 1~3개만 생성**하며, **크기·중요도·적합도 기준 우선순위 선택 + 겹치는 핫스팟 배제** 로직을 적용하여, 핫스팟 UX의 품질을 완성한다.

**배경**: 현재 핫스팟은 bbox(사각형) 기반으로 표시되며, 정밀분석 시 다수의 핫스팟이 생성될 수 있다. 이로 인해 (1) 핫스팟이 너무 많아 화면이 산만하고, (2) 사각형 영역이 이미지를 과도하게 덮으며, (3) 서로 겹치는 핫스팟이 생기는 문제가 있다. 오브젝트 중앙에 작은 원형 마커로 표현하고 개수를 제한하면 깔끔하면서도 식별성 있는 핫스팟 UX를 제공할 수 있다.

**완료 기준**:

- 정밀분석 결과 핫스팟이 **1~3개로 제한**됨 (백엔드 필터링)
- 핫스팟이 **bbox 중앙에 원형(circle) 마커**로 렌더링됨 (프론트엔드)
- 원형 마커에 **펄스(pulse) 애니메이션**이 적용되어 식별성 확보
- **크기가 큰·중요한·적합한 오브젝트**가 우선 선택됨 (백엔드 우선순위 로직)
- **겹치는 핫스팟**(중심 거리 임계값 이내)이 자동 배제됨 (백엔드 필터)
- 기존 bbox 좌표 규약(0~1000, [ymin,xmin,ymax,xmax]) 유지 (데이터 호환)
- `prefers-reduced-motion` 시 펄스 애니메이션 정적 대체

## 영향받는 파일

**수정**:

- `backend/prompts/image/analyze_scene.ko.md` - 정밀분석 프롬프트에 "1~3개 핫스팟, 크기/중요도 우선" 지시 추가
- `backend/prompts/image/analyze_scene.en.md` - 동일 (영문)
- `backend/src/unknown_world/orchestrator/stages/resolve.py` - 핫스팟 후처리: 우선순위 정렬 + 1~3개 제한 + 겹침 제거 필터
- `frontend/src/components/SceneCanvas.tsx` - 핫스팟 렌더링을 bbox 사각형에서 **중앙 원형 마커**로 변경 + 펄스 애니메이션
- `frontend/src/style.css` - 원형 핫스팟 스타일, 펄스 애니메이션, hover 효과, reduced-motion 가드

**참조**:

- `vibe/unit-results/U-090[Mvp].md` - 핫스팟 생성을 정밀분석 전용으로 제한
- `vibe/unit-results/U-076[Mvp].md` - 정밀분석 Agentic Vision 파이프라인
- `vibe/unit-results/U-058[Mvp].md` - 핫스팟 디자인 개선 (코너/스트로크/색상)
- `vibe/unit-results/U-089[Mvp].md` - 정밀분석 실행 시 기존 이미지 유지
- `vibe/prd.md` 6.2절 - 핫스팟 좌표/생성 정책

## 구현 흐름

### 1단계: 백엔드 - 정밀분석 프롬프트 수정

- `analyze_scene.*.md`에 다음 지시 추가:
  - "장면에서 가장 중요하고 상호작용 가능한 오브젝트를 **1~3개만** 선택한다."
  - "선택 기준: (1) 화면에서 차지하는 크기가 크고, (2) 게임 진행에 중요하며, (3) 맥락상 상호작용에 적합한 오브젝트 우선"
  - "서로 가까이 있거나 겹치는 오브젝트는 하나만 선택한다."

### 2단계: 백엔드 - 핫스팟 후처리 필터 구현

- `resolve.py`에서 정밀분석 결과의 `ui.objects[]`를 후처리:
  1. **우선순위 정렬**: bbox 면적(크기) × confidence(있으면) 기준 내림차순 정렬
  2. **겹침 필터**: 중심점 간 거리가 임계값(예: 100, 0~1000 좌표계 기준) 미만이면 후순위 제거
  3. **개수 제한**: 최대 3개까지만 유지
  4. 결과를 `ui.objects[]`에 반영

```python
# resolve.py (개념)
def filter_hotspots(objects: list, max_count: int = 3, min_distance: int = 100):
    # 면적 기준 정렬
    sorted_objs = sorted(objects, key=lambda o: bbox_area(o.box_2d), reverse=True)
    
    selected = []
    for obj in sorted_objs:
        if len(selected) >= max_count:
            break
        center = bbox_center(obj.box_2d)
        if not any(distance(center, bbox_center(s.box_2d)) < min_distance for s in selected):
            selected.append(obj)
    
    return selected
```

### 3단계: 프론트엔드 - 핫스팟 원형 렌더링

- `SceneCanvas.tsx`에서 핫스팟을 bbox 사각형 대신 **중앙 원형**으로 렌더링:
  - 원형 중심: `((xmin + xmax) / 2, (ymin + ymax) / 2)` (0~1000 좌표계)
  - 원형 반지름: `min(width, height) * 0.15` (bbox 크기에 비례하되 컴팩트하게)
  - 최소/최대 반지름 제한: 15~40px (화면 크기 대비)

```css
/* style.css */
.hotspot-circle {
  position: absolute;
  border-radius: 50%;
  border: 2px solid var(--accent-color);
  background: rgba(255, 0, 255, 0.15);
  cursor: pointer;
  animation: hotspot-pulse 2s ease-in-out infinite;
}

@keyframes hotspot-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 8px var(--accent-color); }
  50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 16px var(--accent-color); }
}

@media (prefers-reduced-motion: reduce) {
  .hotspot-circle {
    animation: none;
    opacity: 0.9;
    box-shadow: 0 0 12px var(--accent-color);
  }
}
```

### 4단계: hover/클릭 인터랙션

- 원형 마커 hover 시: 살짝 확대 + 라벨 툴팁 표시(오브젝트 이름)
- 클릭 시: 기존 핫스팟 클릭 동작 유지 (TurnInput 이벤트)
- 드롭 타겟: 원형 영역에 아이템 DnD 드롭 가능 (기존 동작 유지)
- 클릭 영역: 원형 마커 + 주변 약간의 여유(hit area 확대)

### 5단계: 검증 및 엣지 케이스

- 정밀분석에서 0개 핫스팟 반환 시: 정상 동작(핫스팟 없음)
- 이전 핫스팟 + 새 정밀분석 결과 병합 시 총 개수 3개 초과 방지
- bbox가 매우 작은 경우(< 50x50) 최소 반지름 적용으로 클릭 가능성 보장

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-090[Mvp]](../unit-results/U-090[Mvp].md) - 핫스팟 정밀분석 전용 정책
- **결과물**: [U-087[Mvp]](unit-plans/U-087[Mvp].md) - 처리중 입력 잠금 (핫스팟 클릭 포함)
- **결과물**: [U-116[Mvp]](unit-plans/U-116[Mvp].md) - SaveGame 제거 + 초기 핫스팟 제거 (U-098 흡수)
- **결과물**: [U-058[Mvp]](../unit-results/U-058[Mvp].md) - 핫스팟 디자인 기반

**다음 작업에 전달할 것**:

- CP-MVP-03: 핫스팟 UX 완성 상태에서 "정밀분석 → 클릭 → 드래그" 데모 시나리오 검증
- U-109[Mmp]: 자동 실행 확장 시 동일 핫스팟 필터/렌더링 재사용

## 주의사항

**기술적 고려사항**:

- (RULE-009) bbox 좌표 규약(0~1000, [ymin,xmin,ymax,xmax])은 **데이터 레벨에서 유지** → 프론트엔드에서만 원형으로 렌더링 변환
- 핫스팟 관련 모든 선행 유닛(U-058, U-076, U-089, U-090, U-087, U-098)이 완료된 후 마지막으로 진행
- 원형 마커의 클릭 영역이 충분히 커야 함 (44px 이상 터치 타겟)
- CRT 테마의 accent-color(--accent-color)를 사용하여 일관된 시각 언어 유지

**잠재적 리스크**:

- 원형 마커가 너무 작으면 발견성 저하 → 펄스 애니메이션 + 최소 반지름 제한으로 보완
- 1~3개 제한으로 중요한 오브젝트가 누락될 수 있음 → 추가 정밀분석 실행으로 다른 오브젝트 발견 가능(다음 정밀분석 시 이전 결과 병합)
- 겹침 판정 임계값이 너무 크면 유효한 인접 오브젝트가 제거됨 → 튜닝 필요(100~150 범위)

## 페어링 질문 (결정 필요)

- [x] **Q1**: 원형 마커 반지름 계산 방식?
  - Option A: bbox 크기에 비례 (큰 오브젝트 = 큰 마커)
  - ✅Option B: 고정 반지름 (모든 마커 동일 크기)
  - Option C: 중요도에 따라 크기 차등 (중요한 것 = 큰 마커)

- [x] **Q2**: 추가 정밀분석 시 이전 핫스팟과의 관계?
  - Option A: 이전 핫스팟 교체(최신 결과만 유지)
  - Option B: 병합(총 최대 3개, 겹침 제거 후)
  - Option C: 사용자 선택(기존 유지/교체)
  - ✅Option D: 현재 사양상 추가 정밀분석 불가 (한번 분석한 턴은 추가 분석 불가)

- [x] **Q3**: 겹침 판정 임계값(0~1000 좌표계)?
  - Option A: 100 (약 10% 거리)
  - ✅Option B: 150 (약 15% 거리)
  - Option C: 동적 계산 (두 bbox 크기 합의 일정 비율)

## 참고 자료

- `vibe/unit-results/U-090[Mvp].md` - 핫스팟 정밀분석 전용 정책
- `vibe/unit-results/U-076[Mvp].md` - 정밀분석 Agentic Vision 파이프라인
- `vibe/unit-results/U-058[Mvp].md` - 핫스팟 디자인 개선
- `vibe/prd.md` 6.2절 - 핫스팟 좌표/생성 정책, 8.6절 - 이미지 이해
