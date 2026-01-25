#!/usr/bin/env python3
"""U-035 rembg 배경 제거 통합 수동 테스트 스크립트.

이 스크립트는 image_postprocess 모듈의 기능을 테스트합니다.
실행: cd backend && python tests/manual_test_rembg.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(project_root))


def test_model_selection():
    """이미지 유형 힌트에 따른 모델 선택 테스트."""
    from unknown_world.services.image_postprocess import (
        RembgModel,
        select_model_from_hint,
    )

    print("=" * 60)
    print("테스트 1: 모델 선택 로직")
    print("=" * 60)

    test_cases = [
        (None, RembgModel.BIREFNET_GENERAL, False),
        ("object", RembgModel.BIREFNET_GENERAL, False),
        ("icon", RembgModel.BIREFNET_GENERAL, False),
        ("character", RembgModel.ISNET_ANIME, False),
        ("anime", RembgModel.ISNET_ANIME, False),
        ("portrait", RembgModel.BIREFNET_PORTRAIT, True),
        ("human", RembgModel.U2NET_HUMAN_SEG, True),
        ("unknown_type", RembgModel.BIREFNET_GENERAL, False),
    ]

    all_passed = True
    for hint, expected_model, expected_alpha in test_cases:
        model, alpha = select_model_from_hint(hint)
        passed = model == expected_model and alpha == expected_alpha
        status = "[OK]" if passed else "[NG]"
        if not passed:
            all_passed = False
        print(f"  {status} hint='{hint}' -> model={model.value}, alpha={alpha}")
        print(f"      (expected: {expected_model.value}, {expected_alpha})")

    return all_passed


def test_postprocessor_availability():
    """ImagePostprocessor 사용 가능 여부 테스트."""
    from unknown_world.services.image_postprocess import get_image_postprocessor

    print()
    print("=" * 60)
    print("테스트 2: rembg 사용 가능 여부")
    print("=" * 60)

    postprocessor = get_image_postprocessor()
    available = postprocessor.is_available()
    status = "[OK]" if available else "[WARN]"
    print(f"  {status} rembg available: {available}")

    if not available:
        print("  [WARN] rembg is not installed. Install: pip install rembg")
        return False

    return True


def test_image_generation_request():
    """ImageGenerationRequest에 새 필드가 추가되었는지 확인."""
    from unknown_world.services.image_generation import ImageGenerationRequest

    print()
    print("=" * 60)
    print("테스트 3: ImageGenerationRequest 스키마 확장")
    print("=" * 60)

    # 새 필드로 인스턴스 생성 테스트
    request = ImageGenerationRequest(
        prompt="A magical sword with glowing runes",
        remove_background=True,
        image_type_hint="object",
    )

    checks = [
        ("remove_background 필드", hasattr(request, "remove_background")),
        ("image_type_hint 필드", hasattr(request, "image_type_hint")),
        ("remove_background=True", request.remove_background is True),
        ("image_type_hint='object'", request.image_type_hint == "object"),
    ]

    all_passed = True
    for desc, passed in checks:
        status = "[OK]" if passed else "[NG]"
        if not passed:
            all_passed = False
        print(f"  {status} {desc}")

    return all_passed


def test_image_job_schema():
    """ImageJob 스키마에 새 필드가 추가되었는지 확인."""
    from unknown_world.models.turn import ImageJob

    print()
    print("=" * 60)
    print("테스트 4: ImageJob 스키마 확장 (TurnOutput.render.image_job)")
    print("=" * 60)

    # 새 필드로 인스턴스 생성 테스트
    image_job = ImageJob(
        should_generate=True,
        prompt="A glowing crystal",
        remove_background=True,
        image_type_hint="object",
    )

    checks = [
        ("remove_background 필드", hasattr(image_job, "remove_background")),
        ("image_type_hint 필드", hasattr(image_job, "image_type_hint")),
        ("remove_background=True", image_job.remove_background is True),
        ("image_type_hint='object'", image_job.image_type_hint == "object"),
    ]

    all_passed = True
    for desc, passed in checks:
        status = "[OK]" if passed else "[NG]"
        if not passed:
            all_passed = False
        print(f"  {status} {desc}")

    return all_passed


def main():
    """모든 테스트 실행."""
    print()
    print("[TEST] U-035 rembg Background Removal Integration Test")
    print("=" * 60)

    results = []

    try:
        results.append(("Model Selection Logic", test_model_selection()))
    except Exception as e:
        print(f"  [NG] Model selection test error: {e}")
        results.append(("Model Selection Logic", False))

    try:
        results.append(("rembg Availability", test_postprocessor_availability()))
    except Exception as e:
        print(f"  [NG] rembg availability test error: {e}")
        results.append(("rembg Availability", False))

    try:
        results.append(("ImageGenerationRequest Schema", test_image_generation_request()))
    except Exception as e:
        print(f"  [NG] ImageGenerationRequest test error: {e}")
        results.append(("ImageGenerationRequest Schema", False))

    try:
        results.append(("ImageJob Schema", test_image_job_schema()))
    except Exception as e:
        print(f"  [NG] ImageJob test error: {e}")
        results.append(("ImageJob Schema", False))

    # 결과 요약
    print()
    print("=" * 60)
    print("[SUMMARY] Test Results")
    print("=" * 60)

    all_passed = True
    for name, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f"  {status}: {name}")

    print()
    if all_passed:
        print("[OK] All tests passed!")
        return 0
    else:
        print("[ERROR] Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
