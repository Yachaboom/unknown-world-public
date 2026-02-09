"""Unknown World - API 패키지.

이 패키지는 FastAPI 라우터들을 포함합니다.
"""

from unknown_world.api.ending_report import router as ending_report_router
from unknown_world.api.image import router as image_router
from unknown_world.api.item_icon import router as item_icon_router
from unknown_world.api.scanner import router as scanner_router
from unknown_world.api.turn import router as turn_router

__all__ = [
    "ending_report_router",
    "image_router",
    "item_icon_router",
    "scanner_router",
    "turn_router",
]
