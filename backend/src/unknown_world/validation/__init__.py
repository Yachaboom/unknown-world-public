"""Unknown World - 검증 모듈.

비즈니스 룰 검증기 및 언어 혼합 검증 게이트를 제공합니다.
"""

from unknown_world.validation.business_rules import (
    BusinessRuleError,
    BusinessRuleValidationResult,
    validate_business_rules,
)
from unknown_world.validation.language_gate import (
    MIXED_THRESHOLD_RATIO,
    LanguageGateResult,
    LanguageRatio,
    build_language_error_summary,
    is_language_mixed,
    measure_language_ratio,
    validate_language_consistency,
)

__all__ = [
    # Business Rules
    "BusinessRuleError",
    "BusinessRuleValidationResult",
    "validate_business_rules",
    # Language Gate (U-043)
    "MIXED_THRESHOLD_RATIO",
    "LanguageGateResult",
    "LanguageRatio",
    "build_language_error_summary",
    "is_language_mixed",
    "measure_language_ratio",
    "validate_language_consistency",
]
