import os

import pytest


@pytest.fixture(autouse=True)
def setup_test_env():
    """모든 테스트에서 UW_MODE=mock을 기본으로 사용하도록 설정합니다."""
    # 이미 설정된 경우(예: CI)는 유지하고, 로컬에서 수동 실행 시 기본값 보장
    if "UW_MODE" not in os.environ:
        os.environ["UW_MODE"] = "mock"

    # 이미지 생성 테스트를 위해 출력 디렉토리 보장
    from pathlib import Path

    output_dir = Path("test_output")
    output_dir.mkdir(parents=True, exist_ok=True)

    yield
