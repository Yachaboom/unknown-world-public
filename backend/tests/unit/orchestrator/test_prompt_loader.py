"""Unit tests for prompt_loader.py.

U-036: 프롬프트 로더 핫리로드 테스트
U-046: XML 태그 파싱 + 레거시 폴백 테스트
"""

from __future__ import annotations

import os
import unittest

from unknown_world.models.turn import Language
from unknown_world.orchestrator.prompt_loader import (
    _parse_frontmatter,
    _parse_legacy_frontmatter,
    _parse_xml_meta,
    clear_prompt_cache,
    is_hot_reload_enabled,
    load_prompt,
    load_prompt_with_metadata,
)


class TestPromptLoader(unittest.TestCase):
    def setUp(self) -> None:
        # Clear cache before each test
        clear_prompt_cache()
        # Backup environment
        self._old_env = os.environ.get("ENVIRONMENT")

    def tearDown(self) -> None:
        # Restore environment
        if self._old_env is None:
            if "ENVIRONMENT" in os.environ:
                del os.environ["ENVIRONMENT"]
        else:
            os.environ["ENVIRONMENT"] = self._old_env
        # Clear cache
        clear_prompt_cache()

    def test_load_prompt_ko(self) -> None:
        """Verify loading Korean prompt."""
        # This assumes the file exists in backend/prompts/system/game_master.ko.md
        prompt = load_prompt("system", "game_master", Language.KO)
        self.assertGreater(len(prompt), 0)
        self.assertIn("#", prompt)  # Should be markdown

    def test_load_prompt_en(self) -> None:
        """Verify loading English prompt."""
        prompt = load_prompt("system", "game_master", Language.EN)
        self.assertGreater(len(prompt), 0)

    def test_load_with_metadata(self) -> None:
        """Verify frontmatter parsing."""
        data = load_prompt_with_metadata("system", "game_master", Language.KO)
        self.assertIsNotNone(data.content)
        self.assertIsInstance(data.metadata, dict)
        # Check for typical metadata fields if they exist in the file
        if "prompt_id" in data.metadata:
            self.assertGreater(len(data.metadata["prompt_id"]), 0)

    def test_hot_reload_development(self) -> None:
        """Verify hot-reload works in development mode."""
        os.environ["ENVIRONMENT"] = "development"
        self.assertTrue(is_hot_reload_enabled())

        # Use a temporary file to test hot-reload
        test_category = "system"
        test_name = "test_hot_reload"
        test_lang = Language.KO

        # Determine prompt path
        # In prompt_loader.py, _PROMPTS_ROOT is Path(__file__).parent.parent.parent.parent / "prompts"
        # Since we are in tests/unit/orchestrator/, we need to find the prompts root.
        # But let's mock _get_prompt_path or just use an existing one if possible.
        # Actually, creating a real file is better for verifying "hot-reload" of file system.

        from unknown_world.orchestrator.prompt_loader import _PROMPTS_ROOT

        test_dir = _PROMPTS_ROOT / test_category
        test_dir.mkdir(parents=True, exist_ok=True)
        test_file = test_dir / f"{test_name}.ko.md"

        try:
            # Initial content
            test_file.write_text("# Test\n\nContent 1", encoding="utf-8")

            p1 = load_prompt(test_category, test_name, test_lang)
            self.assertIn("Content 1", p1)

            # Modify file
            test_file.write_text("# Test\n\nContent 2", encoding="utf-8")

            # Load again - should be updated in dev mode
            p2 = load_prompt(test_category, test_name, test_lang)
            self.assertIn("Content 2", p2)
            self.assertNotEqual(p1, p2)

        finally:
            if test_file.exists():
                test_file.unlink()

    def test_caching_production(self) -> None:
        """Verify caching works in production mode (no hot-reload)."""
        os.environ["ENVIRONMENT"] = "production"
        self.assertFalse(is_hot_reload_enabled())

        test_category = "system"
        test_name = "test_caching"
        test_lang = Language.KO

        from unknown_world.orchestrator.prompt_loader import _PROMPTS_ROOT

        test_dir = _PROMPTS_ROOT / test_category
        test_dir.mkdir(parents=True, exist_ok=True)
        test_file = test_dir / f"{test_name}.ko.md"

        try:
            # Initial content
            test_file.write_text("# Test\n\nInitial", encoding="utf-8")

            p1 = load_prompt(test_category, test_name, test_lang)
            self.assertIn("Initial", p1)

            # Modify file
            test_file.write_text("# Test\n\nModified", encoding="utf-8")

            # Load again - should STILL be Initial because of caching
            p2 = load_prompt(test_category, test_name, test_lang)
            self.assertEqual(p1, p2)
            self.assertIn("Initial", p2)

            # After clearing cache, it should be updated
            clear_prompt_cache()
            p3 = load_prompt(test_category, test_name, test_lang)
            self.assertIn("Modified", p3)

        finally:
            if test_file.exists():
                test_file.unlink()

    def test_fallback_language(self) -> None:
        """Verify fallback to other language if requested file is missing."""
        # Create ONLY English version
        test_category = "system"
        test_name = "test_fallback"

        from unknown_world.orchestrator.prompt_loader import _PROMPTS_ROOT

        test_dir = _PROMPTS_ROOT / test_category
        test_dir.mkdir(parents=True, exist_ok=True)
        en_file = test_dir / f"{test_name}.en.md"
        ko_file = test_dir / f"{test_name}.ko.md"

        try:
            en_file.write_text("# English Content", encoding="utf-8")
            if ko_file.exists():
                ko_file.unlink()

            # Request KO, should get EN
            prompt = load_prompt(test_category, test_name, Language.KO)
            self.assertIn("English Content", prompt)

        finally:
            if en_file.exists():
                en_file.unlink()


class TestXmlParsing(unittest.TestCase):
    """U-046: XML 태그 파싱 테스트."""

    def test_parse_xml_meta_valid(self) -> None:
        """Valid XML meta tags should be parsed correctly."""
        text = """<prompt_meta>
  <prompt_id>test_prompt</prompt_id>
  <language>ko-KR</language>
  <version>0.2.0</version>
  <last_updated>2026-01-28</last_updated>
  <policy_preset>default</policy_preset>
</prompt_meta>

<prompt_body>
## 목적
테스트 프롬프트입니다.

## 내용
본문 내용이 여기에 들어갑니다.
</prompt_body>
"""
        result = _parse_xml_meta(text)
        self.assertIsNotNone(result)
        metadata, content = result  # type: ignore

        # 메타데이터 검증
        self.assertEqual(metadata["prompt_id"], "test_prompt")
        self.assertEqual(metadata["language"], "ko-KR")
        self.assertEqual(metadata["version"], "0.2.0")
        self.assertEqual(metadata["last_updated"], "2026-01-28")
        self.assertEqual(metadata["policy_preset"], "default")

        # 본문 검증 (메타 블록 제외)
        self.assertIn("## 목적", content)
        self.assertIn("테스트 프롬프트입니다.", content)
        self.assertNotIn("<prompt_meta>", content)
        self.assertNotIn("<prompt_body>", content)

    def test_parse_xml_meta_no_body_tag(self) -> None:
        """XML meta without body tag should use remaining text as content."""
        text = """<prompt_meta>
  <prompt_id>test</prompt_id>
  <version>0.1.0</version>
</prompt_meta>

## Content Section
This is the content without body tag.
"""
        result = _parse_xml_meta(text)
        self.assertIsNotNone(result)
        metadata, content = result  # type: ignore

        self.assertEqual(metadata["prompt_id"], "test")
        self.assertIn("## Content Section", content)

    def test_parse_xml_meta_returns_none_for_legacy(self) -> None:
        """Legacy format should return None from _parse_xml_meta."""
        text = """# [Prompt] Test

- prompt_id: legacy_test
- version: 0.1.0

## Content
Legacy content here.
"""
        result = _parse_xml_meta(text)
        self.assertIsNone(result)

    def test_parse_legacy_frontmatter(self) -> None:
        """Legacy frontmatter should be parsed correctly."""
        text = """# [Prompt] Test

- prompt_id: legacy_test
- language: en-US
- version: 0.1.0

## Content
Legacy content here.
"""
        metadata, content = _parse_legacy_frontmatter(text)

        self.assertEqual(metadata["prompt_id"], "legacy_test")
        self.assertEqual(metadata["language"], "en-US")
        self.assertEqual(metadata["version"], "0.1.0")
        self.assertIn("## Content", content)
        self.assertIn("Legacy content here.", content)

    def test_parse_frontmatter_prefers_xml(self) -> None:
        """_parse_frontmatter should prefer XML format when available."""
        xml_text = """<prompt_meta>
  <prompt_id>xml_test</prompt_id>
  <version>0.2.0</version>
</prompt_meta>

<prompt_body>
## XML Content
This is XML format.
</prompt_body>
"""
        metadata, content = _parse_frontmatter(xml_text)

        self.assertEqual(metadata["prompt_id"], "xml_test")
        self.assertEqual(metadata["version"], "0.2.0")
        self.assertIn("## XML Content", content)

    def test_parse_frontmatter_fallback_to_legacy(self) -> None:
        """_parse_frontmatter should fallback to legacy when XML is missing."""
        legacy_text = """# [Prompt] Test

- prompt_id: fallback_test
- version: 0.1.0

## Content
Fallback content.
"""
        metadata, content = _parse_frontmatter(legacy_text)

        self.assertEqual(metadata["prompt_id"], "fallback_test")
        self.assertIn("## Content", content)

    def test_load_prompt_with_xml_metadata(self) -> None:
        """Integration test: load_prompt_with_metadata with XML format."""
        # Load actual prompt file (migrated to XML format)
        data = load_prompt_with_metadata("system", "game_master", Language.KO)

        self.assertIsNotNone(data.content)
        self.assertIsInstance(data.metadata, dict)

        # Check metadata fields
        self.assertEqual(data.metadata.get("prompt_id"), "game_master_system")
        self.assertEqual(data.metadata.get("language"), "ko-KR")
        self.assertIn("version", data.metadata)

        # Content should not contain meta tags
        self.assertNotIn("<prompt_meta>", data.content)
        self.assertNotIn("<prompt_body>", data.content)
        self.assertIn("## 목적", data.content)

    def test_load_prompt_with_xml_metadata_en(self) -> None:
        """Integration test: English XML format."""
        data = load_prompt_with_metadata("system", "game_master", Language.EN)

        self.assertEqual(data.metadata.get("prompt_id"), "game_master_system")
        self.assertEqual(data.metadata.get("language"), "en-US")
        self.assertIn("## Purpose", data.content)


if __name__ == "__main__":
    unittest.main()
