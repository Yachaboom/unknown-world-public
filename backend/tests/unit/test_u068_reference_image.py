"""U-068: 이전 턴 이미지를 참조이미지로 사용하는 기능 테스트."""

import pytest

from unknown_world.models.turn import ImageJob, ModelLabel
from unknown_world.services.image_generation import ImageGenerationRequest, MockImageGenerator


def test_image_job_reference_image_url_field():
    """ImageJob 모델에 reference_image_url 필드가 있는지 확인합니다."""
    job = ImageJob(
        should_generate=True,
        prompt="A mysterious forest",
        model_label=ModelLabel.QUALITY,
        reference_image_url="http://example.com/prev.png",  # 이 부분이 실패해야 함
    )
    assert job.reference_image_url == "http://example.com/prev.png"


@pytest.mark.asyncio
async def test_mock_generator_handles_reference_image_url():
    """MockImageGenerator가 reference_image_url이 포함된 요청을 처리하는지 확인합니다."""
    generator = MockImageGenerator()
    request = ImageGenerationRequest(
        prompt="A mysterious forest", reference_image_url="http://example.com/prev.png"
    )

    # MockImageGenerator.generate는 현재 reference_image_url을 무시하지만 에러는 나지 않아야 함
    response = await generator.generate(request)
    assert response.status.value == "completed"
    assert response.image_url is not None
