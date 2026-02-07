"""Unknown World - 프롬프트 로더 유틸리티.

이 모듈은 언어별로 분리된 프롬프트 파일을 로드합니다.
XML 태그 기반 메타데이터 파싱 및 핫리로드를 지원합니다.

설계 원칙:
    - RULE-006: ko/en 언어 정책 준수 (혼합 출력 금지)
    - RULE-007/008: 프롬프트 원문 UI/로그 노출 금지
    - U-036: 핫리로드 (개발 모드), 프론트매터 파싱 지원
    - U-046: XML 태그 규격 통일 (메타/섹션) + 레거시 폴백

프롬프트 디렉토리 구조:
    backend/prompts/
    ├── system/
    │   ├── game_master.ko.md
    │   └── game_master.en.md
    ├── turn/
    │   ├── turn_output_instructions.ko.md
    │   └── turn_output_instructions.en.md
    └── image/
        ├── scene_prompt.ko.md
        └── scene_prompt.en.md

XML 태그 규격 (U-046):
    <prompt_meta>
      <prompt_id>game_master_system</prompt_id>
      <language>ko-KR</language>
      <version>0.1.0</version>
      <last_updated>YYYY-MM-DD</last_updated>
      <policy_preset>default</policy_preset>
    </prompt_meta>

    <prompt_body>
    ## 목적
    ...
    </prompt_body>

페어링 질문 결정:
    - U-036 Q1: Option A (개발 모드에서만 매 호출 시 리로드)
    - U-036 Q2: Option B (프론트매터 포함 마크다운)
    - U-046 Q1: Option A (메타 블록을 모델 입력에서 제거)
    - U-046 Q2: Option A (XML 파싱 실패 시 레거시 폴백)

참조:
    - vibe/prd.md 3.2 (프롬프트 파일 관리)
    - vibe/prd.md 10.4 (프롬프트 핫리로드)
    - .cursor/rules/30-prompts-i18n.mdc
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Literal

from unknown_world.models.turn import Language

# =============================================================================
# 로거 설정 (프롬프트 원문 로깅 금지 - RULE-007/008)
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# 경로 상수
# =============================================================================

# 프롬프트 루트 디렉토리 (backend/prompts/)
_PROMPTS_ROOT = Path(__file__).parent.parent.parent.parent / "prompts"

# 프롬프트 카테고리
PromptCategory = Literal["system", "turn", "image", "scan", "vision"]

# 언어 코드 매핑
_LANGUAGE_CODE_MAP: dict[Language, str] = {
    Language.KO: "ko",
    Language.EN: "en",
}

# =============================================================================
# 프론트매터 파싱 결과 타입
# =============================================================================


@dataclass
class PromptData:
    """프론트매터가 파싱된 프롬프트 데이터.

    Attributes:
        content: 프롬프트 본문 (프론트매터 제외)
        metadata: 프론트매터에서 추출한 메타데이터
        raw: 원본 전체 텍스트
    """

    content: str
    metadata: dict[str, str] = field(default_factory=lambda: {})
    raw: str = ""

    def to_dict(self) -> dict[str, str | dict[str, str]]:
        """JSON 직렬화 가능한 딕셔너리로 변환합니다.

        Returns:
            프롬프트 데이터 딕셔너리
        """
        return {
            "content": self.content,
            "metadata": self.metadata,
        }


# =============================================================================
# 환경 모드 확인
# =============================================================================


def _is_development_mode() -> bool:
    """개발 모드인지 확인합니다.

    ENVIRONMENT 환경변수가 'development'이면 개발 모드입니다.
    개발 모드에서는 프롬프트 핫리로드가 활성화됩니다.

    Returns:
        개발 모드 여부
    """
    return os.environ.get("ENVIRONMENT", "production").lower() == "development"


# =============================================================================
# XML 태그 및 프론트매터 파싱 (U-046)
# =============================================================================

# XML 태그 패턴 (U-046 표준)
_XML_META_PATTERN = re.compile(
    r"<prompt_meta>\s*(.*?)\s*</prompt_meta>",
    re.DOTALL,
)
_XML_BODY_PATTERN = re.compile(
    r"<prompt_body>\s*(.*?)\s*</prompt_body>",
    re.DOTALL,
)
_XML_TAG_PATTERN = re.compile(r"<(\w+)>([^<]*)</\1>")

# 레거시 프론트매터 패턴: 파일 시작 부분의 "- key: value" 형태
_FRONTMATTER_LINE_PATTERN = re.compile(r"^-\s*(\w+):\s*(.+)$")


def _parse_xml_meta(text: str) -> tuple[dict[str, str], str] | None:
    """XML 태그 기반 메타데이터와 본문을 파싱합니다.

    U-046 표준 XML 태그 규격:
        <prompt_meta>
          <prompt_id>game_master_system</prompt_id>
          <language>ko-KR</language>
          <version>0.1.0</version>
          <last_updated>YYYY-MM-DD</last_updated>
          <policy_preset>default</policy_preset>
        </prompt_meta>

        <prompt_body>
        ## 목적
        ...
        </prompt_body>

    Args:
        text: 원본 텍스트

    Returns:
        (메타데이터 딕셔너리, 본문 텍스트) 튜플
        XML 태그가 없으면 None 반환 (레거시 폴백 필요)
    """
    meta_match = _XML_META_PATTERN.search(text)
    body_match = _XML_BODY_PATTERN.search(text)

    # XML 태그가 없으면 None 반환
    if not meta_match:
        return None

    # 메타데이터 파싱
    meta_content = meta_match.group(1)
    metadata: dict[str, str] = {}
    for tag_match in _XML_TAG_PATTERN.finditer(meta_content):
        key = tag_match.group(1)
        value = tag_match.group(2).strip()
        metadata[key] = value

    # 본문 추출 (U-046 Q1: 메타 블록을 모델 입력에서 제거)
    if body_match:
        content = body_match.group(1).strip()
    else:
        # <prompt_body>가 없으면 <prompt_meta> 이후 전체를 본문으로 취급
        meta_end = meta_match.end()
        content = text[meta_end:].strip()

    return metadata, content


def _parse_legacy_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """레거시 프론트매터를 파싱합니다 (U-036 호환).

    프론트매터는 첫 번째 제목(#) 이후, 두 번째 제목(##) 이전의
    "- key: value" 형태의 라인들입니다.

    예시 구조:
        # [Prompt] Title

        - prompt_id: xxx
        - version: 0.1.0

        ## 본문 섹션
        ...

    Args:
        text: 원본 마크다운 텍스트

    Returns:
        (메타데이터 딕셔너리, 본문 텍스트) 튜플
    """
    lines = text.split("\n")
    metadata: dict[str, str] = {}
    content_start_idx = 0
    found_first_heading = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # 빈 줄은 건너뜀
        if not stripped:
            continue

        # 첫 번째 제목(#) 발견
        if stripped.startswith("#") and not stripped.startswith("##"):
            found_first_heading = True
            continue

        # 두 번째 제목(##) 발견 시 프론트매터 영역 종료, 본문 시작
        if stripped.startswith("##"):
            content_start_idx = i
            break

        # 프론트매터 라인 매칭 (첫 번째 제목 이후)
        if found_first_heading:
            match = _FRONTMATTER_LINE_PATTERN.match(stripped)
            if match:
                key = match.group(1)
                value = match.group(2).strip()
                metadata[key] = value

    # 본문 추출 (두 번째 제목부터)
    content = "\n".join(lines[content_start_idx:]).strip()

    return metadata, content


def _parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """메타데이터와 본문을 파싱합니다 (XML 우선, 레거시 폴백).

    U-046 Q2 결정: XML 태그 파싱 실패 시 레거시 폴백 후 진행

    파싱 우선순위:
        1. XML 태그 기반 (<prompt_meta>, <prompt_body>)
        2. 레거시 프론트매터 (- key: value)

    Args:
        text: 원본 텍스트

    Returns:
        (메타데이터 딕셔너리, 본문 텍스트) 튜플
    """
    # 1. XML 태그 파싱 시도
    xml_result = _parse_xml_meta(text)
    if xml_result is not None:
        metadata, content = xml_result
        logger.debug(
            "[PromptLoader] XML 태그 기반 파싱 완료",
            extra={"format": "xml", "meta_keys": list(metadata.keys())},
        )
        return metadata, content

    # 2. 레거시 폴백 (U-046 Q2: Option A)
    logger.debug(
        "[PromptLoader] 레거시 프론트매터 파싱으로 폴백",
        extra={"format": "legacy"},
    )
    return _parse_legacy_frontmatter(text)


# =============================================================================
# 프롬프트 로더 함수
# =============================================================================


def _get_prompt_path(
    category: PromptCategory,
    name: str,
    language: Language,
) -> Path:
    """프롬프트 파일 경로를 반환합니다.

    Args:
        category: 프롬프트 카테고리 (system, turn, image)
        name: 프롬프트 파일 이름 (확장자 제외)
        language: 언어 (ko-KR, en-US)

    Returns:
        프롬프트 파일 경로

    Example:
        >>> _get_prompt_path("system", "game_master", Language.KO)
        Path(".../prompts/system/game_master.ko.md")
    """
    lang_code = _LANGUAGE_CODE_MAP.get(language, "ko")
    return _PROMPTS_ROOT / category / f"{name}.{lang_code}.md"


def _load_prompt_file(
    category: PromptCategory,
    name: str,
    language: Language,
) -> str:
    """프롬프트 파일을 직접 로드합니다 (캐싱 없음).

    핫리로드 모드에서 사용됩니다.

    Args:
        category: 프롬프트 카테고리
        name: 프롬프트 이름
        language: 언어

    Returns:
        프롬프트 텍스트

    Raises:
        FileNotFoundError: 프롬프트 파일이 없는 경우
    """
    path = _get_prompt_path(category, name, language)

    if not path.exists():
        # 폴백: 반대 언어 시도
        fallback_lang = Language.EN if language == Language.KO else Language.KO
        fallback_path = _get_prompt_path(category, name, fallback_lang)

        if fallback_path.exists():
            logger.warning(
                "[PromptLoader] 폴백 언어 사용",
                extra={
                    "original_language": language.value,
                    "fallback_language": fallback_lang.value,
                },
            )
            return fallback_path.read_text(encoding="utf-8")

        raise FileNotFoundError(f"프롬프트 파일을 찾을 수 없습니다: {path}")

    return path.read_text(encoding="utf-8")


@lru_cache(maxsize=32)
def _load_prompt_cached(
    category: PromptCategory,
    name: str,
    language: Language,
) -> str:
    """프롬프트 파일을 캐싱하여 로드합니다.

    운영 모드에서 사용됩니다.

    Args:
        category: 프롬프트 카테고리
        name: 프롬프트 이름
        language: 언어

    Returns:
        프롬프트 텍스트
    """
    return _load_prompt_file(category, name, language)


def load_prompt(
    category: PromptCategory,
    name: str,
    language: Language,
) -> str:
    """프롬프트 파일을 로드합니다.

    개발 모드(ENVIRONMENT=development)에서는 매 호출 시 파일을 다시 읽습니다 (핫리로드).
    운영 모드에서는 캐싱을 통해 반복 로드를 방지합니다.
    프롬프트 원문은 로그에 기록하지 않습니다 (RULE-007/008).

    Args:
        category: 프롬프트 카테고리 (system, turn, image)
        name: 프롬프트 파일 이름 (확장자 제외)
        language: 언어 (ko-KR, en-US)

    Returns:
        프롬프트 텍스트

    Raises:
        FileNotFoundError: 프롬프트 파일이 없는 경우

    Example:
        >>> prompt = load_prompt("system", "game_master", Language.KO)
    """
    # 로그에는 경로/메타만 기록 (원문 금지)
    logger.debug(
        "[PromptLoader] 프롬프트 로드",
        extra={
            "category": category,
            "name": name,
            "language": language.value,
            "hot_reload": _is_development_mode(),
        },
    )

    # U-036 Q1 결정: 개발 모드에서만 핫리로드
    if _is_development_mode():
        return _load_prompt_file(category, name, language)
    else:
        return _load_prompt_cached(category, name, language)


def load_prompt_with_metadata(
    category: PromptCategory,
    name: str,
    language: Language,
) -> PromptData:
    """프롬프트 파일을 메타데이터와 함께 로드합니다.

    프론트매터를 파싱하여 메타데이터와 본문을 분리합니다.
    JSON 형태로 프롬프트를 전달할 때 유용합니다.

    Args:
        category: 프롬프트 카테고리 (system, turn, image)
        name: 프롬프트 파일 이름 (확장자 제외)
        language: 언어 (ko-KR, en-US)

    Returns:
        PromptData: 메타데이터와 본문이 분리된 프롬프트 데이터

    Example:
        >>> data = load_prompt_with_metadata("system", "game_master", Language.KO)
        >>> print(data.metadata.get("version"))
        >>> print(data.content[:100])
    """
    raw_text = load_prompt(category, name, language)
    metadata, content = _parse_frontmatter(raw_text)

    logger.debug(
        "[PromptLoader] 프롬프트 메타데이터 파싱 완료",
        extra={
            "category": category,
            "name": name,
            "language": language.value,
            "prompt_id": metadata.get("prompt_id", "unknown"),
            "version": metadata.get("version", "unknown"),
        },
    )

    return PromptData(
        content=content,
        metadata=metadata,
        raw=raw_text,
    )


def load_prompt_as_json(
    category: PromptCategory,
    name: str,
    language: Language,
) -> dict[str, str | dict[str, str]]:
    """프롬프트를 JSON 직렬화 가능한 딕셔너리로 로드합니다.

    API 응답이나 모델 입력으로 프롬프트를 전달할 때 유용합니다.

    Args:
        category: 프롬프트 카테고리 (system, turn, image)
        name: 프롬프트 파일 이름 (확장자 제외)
        language: 언어 (ko-KR, en-US)

    Returns:
        프롬프트 딕셔너리 (content, metadata 포함)

    Example:
        >>> prompt_json = load_prompt_as_json("image", "scene_prompt", Language.KO)
        >>> print(prompt_json["metadata"]["prompt_id"])
    """
    data = load_prompt_with_metadata(category, name, language)
    return data.to_dict()


def load_system_prompt(language: Language) -> str:
    """Game Master 시스템 프롬프트를 로드합니다.

    Args:
        language: 언어 (ko-KR, en-US)

    Returns:
        시스템 프롬프트 텍스트
    """
    return load_prompt("system", "game_master", language)


def load_turn_instructions(language: Language) -> str:
    """TurnOutput 지시 프롬프트를 로드합니다.

    Args:
        language: 언어 (ko-KR, en-US)

    Returns:
        TurnOutput 지시 텍스트
    """
    return load_prompt("turn", "turn_output_instructions", language)


def load_image_prompt(language: Language) -> str:
    """이미지 생성 프롬프트를 로드합니다.

    Args:
        language: 언어 (ko-KR, en-US)

    Returns:
        이미지 생성 프롬프트 텍스트
    """
    return load_prompt("image", "scene_prompt", language)


def load_image_prompt_with_metadata(language: Language) -> PromptData:
    """이미지 생성 프롬프트를 메타데이터와 함께 로드합니다.

    Args:
        language: 언어 (ko-KR, en-US)

    Returns:
        PromptData: 메타데이터와 본문이 분리된 이미지 프롬프트 데이터
    """
    return load_prompt_with_metadata("image", "scene_prompt", language)


def clear_prompt_cache() -> None:
    """프롬프트 캐시를 초기화합니다.

    개발 중 핫리로드 또는 테스트 시 사용합니다.
    """
    _load_prompt_cached.cache_clear()
    logger.info("[PromptLoader] 프롬프트 캐시 초기화됨")


def get_prompt_metadata(
    category: PromptCategory,
    name: str,
    language: Language,
) -> dict[str, str]:
    """프롬프트의 메타데이터만 반환합니다.

    본문 없이 버전, 언어, 업데이트 날짜 등 메타정보만 필요할 때 사용합니다.

    Args:
        category: 프롬프트 카테고리
        name: 프롬프트 이름
        language: 언어

    Returns:
        메타데이터 딕셔너리
    """
    data = load_prompt_with_metadata(category, name, language)
    return data.metadata


def is_hot_reload_enabled() -> bool:
    """핫리로드가 활성화되어 있는지 확인합니다.

    Returns:
        핫리로드 활성화 여부
    """
    return _is_development_mode()
