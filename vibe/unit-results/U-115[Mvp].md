# U-115[Mvp]: 핫스팟 컴팩트 원형(Circle) 디자인 + 1~3개 제한 생성 + 우선순위/겹침 방지 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-115[Mvp]
- **단계 번호**: MVP
- **작성 일시**: 2026-02-10 04:30
- **담당**: AI Agent

---

## 1. 작업 요약

정밀분석으로 생성되는 핫스팟을 **오브젝트 중앙의 컴팩트한 원형(Circle) 마커**로 렌더링하고, **한 번에 1~3개만 생성**하며, **크기 기준 우선순위 선택 + 겹치는 핫스팟 배제(중심 거리 150 이상)** 로직을 백엔드·프롬프트·프론트엔드 전 계층에 적용하여 핫스팟 UX 품질을 완성하였습니다.

---

## 2. 작업 범위

- **백엔드 프롬프트 수정**: `scene_affordances.ko.md` / `scene_affordances.en.md`에 "1~3개 선택, 크기/중요도/맥락 기준, 겹침 하나만 선택" 지시 추가
- **백엔드 필터 구현**: `resolve.py`에 `filter_hotspots()` 함수 구현 (면적 기준 정렬 → 겹침 방지 → 최대 3개 제한)
- **프론트엔드 원형 렌더링**: `Hotspot.tsx`를 bbox 사각형에서 고정 반지름(22px) 원형 마커로 변환
- **프론트엔드 스타일**: `hotspot.css`를 원형 전용으로 전면 개편 (펄스 애니메이션, 호버/포커스/DnD/비활성 상태, `prefers-reduced-motion` 대응)

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/prompts/vision/scene_affordances.ko.md` | 수정 | 1~3개 제한, 우선순위/겹침 방지 지시 추가 (한국어) |
| `backend/prompts/vision/scene_affordances.en.md` | 수정 | 동일 지시 추가 (영문) |
| `backend/src/unknown_world/orchestrator/stages/resolve.py` | 수정 | `filter_hotspots()` 함수 및 헬퍼(`_bbox_area`, `_bbox_center`, `_center_distance`) 추가, `_execute_vision_analysis`에 필터 적용 |
| `frontend/src/components/Hotspot.tsx` | 수정 | bbox 사각형 → 원형 중심 마커 렌더링 (고정 반지름 22px, 히트 영역 +6px) |
| `frontend/src/styles/hotspot.css` | 수정 | L자 코너 스타일 → 원형 펄스/호버/DnD/비활성 스타일 전환 |

---

## 4. 구현 상세

### 4.1 백엔드 - filter_hotspots 필터

```python
# resolve.py 핵심 로직
HOTSPOT_MAX_COUNT = 3
HOTSPOT_MIN_DISTANCE = 150  # 0~1000 좌표계 기준

def filter_hotspots(objects, *, max_count=3, min_distance=150):
    sorted_objs = sorted(objects, key=lambda o: _bbox_area(o.box_2d), reverse=True)
    selected = []
    for obj in sorted_objs:
        if len(selected) >= max_count:
            break
        center = _bbox_center(obj.box_2d)
        if not any(_center_distance(center, _bbox_center(s.box_2d)) < min_distance for s in selected):
            selected.append(obj)
    return selected
```

- **정렬**: bbox 면적(height × width) 기준 내림차순 → 큰 오브젝트 우선
- **겹침 방지**: 중심점 간 유클리드 거리 < 150이면 후순위 제거
- **개수 제한**: 최대 3개

### 4.2 프론트엔드 - 원형 마커

- **고정 반지름**: `CIRCLE_RADIUS_PX = 22` (페어링 Q1 결정: Option B)
- **히트 영역**: `HIT_AREA_PADDING_PX = 6` → 터치 타겟 56px (44px 최소 기준 초과)
- **위치**: bbox의 정규화 중심좌표를 뷰포트 픽셀로 변환 후 `translate(-50%, -50%)`

### 4.3 CSS 애니메이션

- **펄스**: `hotspot-pulse` 2s ease-in-out infinite (scale 1.0 ↔ 1.15, opacity 0.7 ↔ 1.0)
- **호버**: 펄스 정지 + scale(1.2) + glow 강화
- **DnD 드롭 타겟**: amber 색상 변환 + 빠른 점멸
- **비활성(disabled)**: grayscale + opacity 0.4 + 포인터 이벤트 차단
- **`prefers-reduced-motion`**: 애니메이션 없음 + 고정 glow로 대체

### 4.4 페어링 결정 반영

| 질문 | 결정 | 구현 |
| --- | --- | --- |
| Q1: 원형 반지름 | Option B: 고정 반지름 | `CIRCLE_RADIUS_PX = 22` |
| Q2: 추가 정밀분석 | Option D: 추가 분석 불가 | 기존 사양 유지, 필터는 단일 분석 결과에만 적용 |
| Q3: 겹침 임계값 | Option B: 150 | `HOTSPOT_MIN_DISTANCE = 150` |

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-115-hotspot-circle-runbook.md`
- **검증 시나리오**: Mock 모드 원형 렌더링, 펄스 애니메이션, 호버 툴팁, 필터링 로직 확인

---

## 6. 리스크 및 주의사항

- **포트 충돌**: 개발 시 여러 백엔드 프로세스가 동일 포트(8011)에 바인딩되는 Windows 특성 주의 → `pnpm kill` 후 재시작 권장
- **겹침 임계값**: 150은 10% 해상도 기준에서 약 15% 거리로, 밀집된 오브젝트가 많은 장면에서 유효 핫스팟이 과도하게 제거될 수 있음 → 추후 튜닝 가능
- **원형 크기**: 고정 22px이 작은 화면에서는 발견성이 낮을 수 있으나, 펄스 애니메이션으로 보완

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **CP-MVP-03**: 10분 데모 루프에서 "정밀분석 → 원형 핫스팟 표시 → 클릭/드래그" 시나리오 검증
2. **U-109[Mmp]**: 자동 실행(Autopilot) 확장 시 동일 핫스팟 필터/렌더링 재사용

### 7.2 의존 단계 확인

- **선행 단계**: U-090[Mvp], U-087[Mvp], U-116[Mvp], U-058[Mvp]
- **후속 단계**: CP-MVP-03 (전체 통합 데모)

---

## 8. 자체 점검 결과

- [x] 정밀분석 결과 핫스팟이 1~3개로 제한됨 (백엔드 `filter_hotspots`)
- [x] 핫스팟이 bbox 중앙에 원형(circle) 마커로 렌더링됨
- [x] 원형 마커에 펄스(pulse) 애니메이션 적용
- [x] 크기가 큰 오브젝트가 우선 선택됨 (면적 기준 내림차순 정렬)
- [x] 겹치는 핫스팟(중심 거리 150 미만) 자동 배제
- [x] bbox 좌표 규약(0~1000, [ymin,xmin,ymax,xmax]) 데이터 레벨 유지 (RULE-009)
- [x] `prefers-reduced-motion` 시 펄스 애니메이션 정적 대체
- [x] 프론트엔드 린트/타입체크 통과
- [x] 백엔드 린트/타입체크 통과
- [x] Mock 모드 브라우저 테스트 통과 (원형 3개 렌더링 확인)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
