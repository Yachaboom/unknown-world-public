/**
 * Unknown World - 스키마 모듈 진입점.
 *
 * TurnInput/TurnOutput Zod 스키마 및 관련 유틸리티를 재내보내기합니다.
 *
 * @module schemas
 */

// =============================================================================
// 스키마 버전
// =============================================================================

export { SCHEMA_VERSION } from './turn';

// =============================================================================
// Enum 스키마 및 타입
// =============================================================================

export {
  LanguageSchema,
  ThemeSchema,
  AgentPhaseSchema,
  ValidationBadgeSchema,
  ModelLabelSchema,
  RiskLevelSchema,
} from './turn';

export type { Language, Theme, AgentPhase, ValidationBadge, ModelLabel, RiskLevel } from './turn';

// =============================================================================
// 공통 하위 타입 스키마 및 타입
// =============================================================================

export { CoordinateSchema, Box2DSchema, CurrencyAmountSchema } from './turn';

export type { Coordinate, Box2D, CurrencyAmount } from './turn';

// =============================================================================
// TurnInput 관련 스키마 및 타입
// =============================================================================

export { ClickInputSchema, ClientInfoSchema, EconomySnapshotSchema, TurnInputSchema } from './turn';

export type { ClickInput, ClientInfo, EconomySnapshot, TurnInput } from './turn';

// =============================================================================
// TurnOutput 관련 스키마 및 타입
// =============================================================================

export {
  // UI
  ActionCardSchema,
  SceneObjectSchema,
  ActionDeckSchema,
  UIOutputSchema,
  // World
  MemoryPinSchema,
  WorldRuleSchema,
  QuestSchema,
  WorldDeltaSchema,
  // Render
  ImageJobSchema,
  RenderOutputSchema,
  // Economy
  EconomyOutputSchema,
  // Safety
  SafetyOutputSchema,
  // Agent Console
  AgentConsoleSchema,
  // Main
  TurnOutputSchema,
} from './turn';

export type {
  // UI
  ActionCard,
  SceneObject,
  ActionDeck,
  UIOutput,
  // World
  MemoryPin,
  WorldRule,
  Quest,
  WorldDelta,
  // Render
  ImageJob,
  RenderOutput,
  // Economy
  EconomyOutput,
  // Safety
  SafetyOutput,
  // Agent Console
  AgentConsole,
  // Main
  TurnOutput,
} from './turn';

// =============================================================================
// 유틸리티 함수
// =============================================================================

export {
  createFallbackTurnOutput,
  safeParseTurnOutput,
  parseTurnInput,
  safeParseTurnInput,
} from './turn';

export type { TurnOutputParseResult, TurnInputSafeParseResult } from './turn';
