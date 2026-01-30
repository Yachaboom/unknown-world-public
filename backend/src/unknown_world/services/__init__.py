"""Unknown World - 서비스 레이어 패키지.

이 패키지는 외부 서비스와의 통신을 담당하는 모듈을 관리합니다.
GenAI 클라이언트, 이미지 생성기, 스토리지 클라이언트 등이 포함됩니다.

참조:
    - vibe/tech-stack.md (google-genai 버전, Vertex AI 인증)
    - .cursor/rules/20-backend-orchestrator.mdc (Vertex 인증/비밀정보 금지)
"""

from unknown_world.services.genai_client import (
    GenAIClient,
    GenAIClientType,
    GenAIMode,
    GenerateRequest,
    GenerateResponse,
    MockGenAIClient,
    get_genai_client,
    reset_genai_client,
)
from unknown_world.services.image_generation import (
    ImageGenerationRequest,
    ImageGenerationResponse,
    ImageGenerationStatus,
    ImageGenerator,
    ImageGeneratorType,
    MockImageGenerator,
    create_fallback_response,
    get_image_generator,
    reset_image_generator,
)
from unknown_world.services.image_understanding import (
    ImageUnderstandingService,
    get_image_understanding_service,
    reset_image_understanding_service,
)

__all__ = [
    # GenAI 클라이언트
    "GenAIClient",
    "GenAIClientType",
    "GenAIMode",
    "GenerateRequest",
    "GenerateResponse",
    "MockGenAIClient",
    "get_genai_client",
    "reset_genai_client",
    # 이미지 생성 (U-019)
    "ImageGenerationRequest",
    "ImageGenerationResponse",
    "ImageGenerationStatus",
    "ImageGenerator",
    "ImageGeneratorType",
    "MockImageGenerator",
    "create_fallback_response",
    "get_image_generator",
    "reset_image_generator",
    # 이미지 이해/Scanner (U-021)
    "ImageUnderstandingService",
    "get_image_understanding_service",
    "reset_image_understanding_service",
]
