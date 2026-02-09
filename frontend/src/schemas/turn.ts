/**
 * Unknown World - TurnInput/TurnOutput Zod 스키마.
 *
 * 이 모듈은 백엔드 Pydantic 모델(U-005)과 1:1 대응하는 Zod 스키마를 정의합니다.
 * 클라이언트 측 검증 및 타입 안전성을 제공합니다.
 *
 * 설계 원칙:
 *   - RULE-003: 구조화 출력(JSON Schema) 우선 + 이중 검증 (서버 Pydantic + 클라 Zod)
 *   - RULE-004: 검증 실패 시 안전 폴백 제공 (UI 멈춤 방지)
 *   - RULE-005: 재화 인바리언트 (cost, balance_after 필수, 잔액 음수 금지)
 *   - RULE-006: ko/en 언어 정책 (Language enum으로 고정)
 *   - RULE-009: 좌표 규약 (0~1000, bbox [ymin,xmin,ymax,xmax])
 *
 * Q1 결정 사항:
 *   - schema_version 포함 (Option A): SaveGame/마이그레이션/검증에 유리
 *
 * @module schemas/turn
 */

import { z } from 'zod';

// =============================================================================
// 스키마 버전 (Q1 결정: Option A - 포함)
// =============================================================================

/**
 * 현재 스키마 버전.
 * SaveGame/마이그레이션/검증에 사용됩니다.
 */
export const SCHEMA_VERSION = '1.0.0' as const;

// =============================================================================
// 공통 Enum 타입
// =============================================================================

/**
 * 지원 언어 (RULE-006).
 * ko/en 혼합 출력 금지. TurnInput.language를 SSOT로 삼아
 * 모든 UI/내러티브/시스템 메시지는 동일 언어로 고정합니다.
 */
export const LanguageSchema = z.enum(['ko-KR', 'en-US']);
export type Language = z.infer<typeof LanguageSchema>;

/**
 * 테마 설정.
 */
export const ThemeSchema = z.enum(['dark', 'light']);
export type Theme = z.infer<typeof ThemeSchema>;

/**
 * 에이전트 실행 단계 (RULE-008).
 * 에이전트형 시스템임을 UI로 증명하기 위한 단계 표시.
 */
export const AgentPhaseSchema = z.enum([
  'parse',
  'validate',
  'plan',
  'resolve',
  'render',
  'verify',
  'commit',
]);
export type AgentPhase = z.infer<typeof AgentPhaseSchema>;

/**
 * 검증 배지 (RULE-008).
 * 턴 결과에 대한 검증 상태를 표시합니다.
 */
export const ValidationBadgeSchema = z.enum([
  'schema_ok',
  'schema_fail',
  'economy_ok',
  'economy_fail',
  'safety_ok',
  'safety_blocked',
  'consistency_ok',
  'consistency_fail',
]);
export type ValidationBadge = z.infer<typeof ValidationBadgeSchema>;

/**
 * 모델/품질 선택 라벨 (RULE-008).
 * 프롬프트 노출 없이 "왜 이 선택이었는지"를 사용자 친화 라벨로 표시.
 */
export const ModelLabelSchema = z.enum(['FAST', 'QUALITY', 'CHEAP', 'REF']);
export type ModelLabel = z.infer<typeof ModelLabelSchema>;

/**
 * 행동 위험도 수준.
 */
export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

// =============================================================================
// 공통 하위 타입
// =============================================================================

/**
 * 정규화 좌표 (RULE-009).
 * 0~1000 범위의 정수입니다.
 */
export const CoordinateSchema = z.number().int().min(0).max(1000).describe('정규화 좌표 (0~1000)');
export type Coordinate = z.infer<typeof CoordinateSchema>;

/**
 * 2D 바운딩 박스 (RULE-009).
 * 좌표는 0~1000 정규화 좌표계이며, bbox는 [ymin, xmin, ymax, xmax] 순서입니다.
 * 이미지 이해 bbox 포맷과 호환됩니다.
 */
export const Box2DSchema = z
  .object({
    ymin: CoordinateSchema.describe('Y 최소값 (상단)'),
    xmin: CoordinateSchema.describe('X 최소값 (좌측)'),
    ymax: CoordinateSchema.describe('Y 최대값 (하단)'),
    xmax: CoordinateSchema.describe('X 최대값 (우측)'),
  })
  .strict();
export type Box2D = z.infer<typeof Box2DSchema>;

/**
 * 재화 수량.
 * signal과 memory_shard는 0 이상이어야 합니다 (RULE-005).
 */
export const CurrencyAmountSchema = z
  .object({
    signal: z.number().int().min(0).describe('시그널 (기본 재화, 0 이상)'),
    memory_shard: z.number().int().min(0).describe('기억 파편 (희귀 재화, 0 이상)'),
  })
  .strict();
export type CurrencyAmount = z.infer<typeof CurrencyAmountSchema>;

// =============================================================================
// TurnInput 관련 타입
// =============================================================================

/**
 * 클릭 입력 정보.
 * 화면 오브젝트 클릭 시 전달되는 정보입니다.
 */
export const ClickInputSchema = z
  .object({
    object_id: z.string().describe('클릭한 오브젝트 ID'),
    box_2d: Box2DSchema.nullable().default(null).describe('클릭 위치 바운딩 박스 (선택)'),
  })
  .strict();
export type ClickInput = z.infer<typeof ClickInputSchema>;

/**
 * 드롭 입력 정보 (U-012).
 * 인벤토리 아이템을 핫스팟에 드롭할 때 전달되는 정보입니다.
 * Q1 결정: Option B - target_box_2d 포함하여 서버가 정확한 위치 해석 가능.
 */
export const DropInputSchema = z
  .object({
    item_id: z.string().describe('드롭한 인벤토리 아이템 ID'),
    target_object_id: z.string().describe('드롭 대상 핫스팟 오브젝트 ID'),
    target_box_2d: Box2DSchema.describe('드롭 대상의 바운딩 박스 (0~1000 정규화)'),
  })
  .strict();
export type DropInput = z.infer<typeof DropInputSchema>;

/**
 * 클라이언트 정보.
 */
export const ClientInfoSchema = z
  .object({
    viewport_w: z.number().int().positive().describe('뷰포트 너비 (픽셀, 양수)'),
    viewport_h: z.number().int().positive().describe('뷰포트 높이 (픽셀, 양수)'),
    theme: ThemeSchema.default('dark').describe('현재 테마'),
  })
  .strict();
export type ClientInfo = z.infer<typeof ClientInfoSchema>;

/**
 * 재화 스냅샷 (클라이언트 → 서버).
 * 클라이언트가 보유한 현재 재화 상태입니다.
 */
export const EconomySnapshotSchema = z
  .object({
    signal: z.number().int().min(0).describe('현재 시그널 잔액 (0 이상)'),
    memory_shard: z.number().int().min(0).describe('현재 기억 파편 잔액 (0 이상)'),
  })
  .strict();
export type EconomySnapshot = z.infer<typeof EconomySnapshotSchema>;

/**
 * 턴 입력 (클라이언트 → 서버).
 * 사용자가 턴을 진행할 때 서버로 전송하는 입력 데이터입니다.
 *
 * U-012: drop 필드 추가 - 인벤토리 아이템을 핫스팟에 드롭할 때 사용.
 */
export const TurnInputSchema = z
  .object({
    language: LanguageSchema.describe('요청 언어 (응답도 동일 언어로 고정)'),
    text: z.string().default('').describe('사용자 자연어 입력'),
    action_id: z.string().nullable().default(null).describe('선택한 액션 카드 ID (선택)'),
    click: ClickInputSchema.nullable().default(null).describe('오브젝트 클릭 정보 (선택)'),
    drop: DropInputSchema.nullable().default(null).describe('아이템 드롭 정보 (선택, U-012)'),
    client: ClientInfoSchema.describe('클라이언트 환경 정보'),
    economy_snapshot: EconomySnapshotSchema.describe('현재 재화 상태'),
    previous_image_url: z
      .string()
      .nullable()
      .default(null)
      .describe('이전 턴 이미지 URL (U-068: 참조 이미지로 사용하여 연속성 유지)'),
    scene_context: z
      .string()
      .nullable()
      .default(null)
      .describe(
        '첫 턴 씬 설명 맥락 (U-133: 사전 생성 이미지의 시각적 요소를 텍스트로 기술, 첫 턴에서만 사용)',
      ),
  })
  .strict();
export type TurnInput = z.infer<typeof TurnInputSchema>;

// =============================================================================
// TurnOutput 관련 타입 - UI
// =============================================================================

/**
 * 비용 추정치 (U-009: 최소/최대 범위).
 * 행동의 예상 비용 범위를 표시합니다.
 */
export const CostEstimateSchema = z
  .object({
    min: CurrencyAmountSchema.describe('최소 예상 비용'),
    max: CurrencyAmountSchema.describe('최대 예상 비용'),
  })
  .strict();
export type CostEstimate = z.infer<typeof CostEstimateSchema>;

/**
 * 액션 카드 (Action Deck) - U-065 단순화.
 * 매 턴 AI가 추천하는 행동 카드입니다.
 *
 * U-065 단순화:
 *   - 제거된 필드: description, cost_estimate, hint, reward_hint, disabled_reason
 *   - risk, is_alternative는 유지 (게임 메카닉에 필수)
 *   - 제거된 정보는 narrative에서 자연어로 표현
 */
export const ActionCardSchema = z
  .object({
    id: z.string().describe('카드 고유 ID'),
    label: z.string().describe('카드 라벨 (표시용)'),
    cost: CurrencyAmountSchema.describe('예상 비용 (기본)'),
    risk: RiskLevelSchema.default('low').describe('위험도'),
    enabled: z.boolean().default(true).describe('실행 가능 여부 (서버 판단)'),
    is_alternative: z.boolean().default(false).describe('저비용 대안 카드 여부'),
  })
  .strict();
export type ActionCard = z.infer<typeof ActionCardSchema>;

/**
 * 장면 오브젝트 (클릭 가능한 핫스팟).
 * 좌표는 0~1000 정규화 좌표계를 사용합니다 (RULE-009).
 */
export const SceneObjectSchema = z
  .object({
    id: z.string().describe('오브젝트 고유 ID'),
    label: z.string().describe('오브젝트 라벨 (표시용)'),
    box_2d: Box2DSchema.describe('바운딩 박스'),
    interaction_hint: z.string().nullable().default(null).describe('상호작용 힌트 (선택)'),
  })
  .strict();
export type SceneObject = z.infer<typeof SceneObjectSchema>;

/**
 * 액션 덱 (Q1 결정: ui.action_deck.cards[] 구조) - U-065 단순화.
 * 매 턴 AI가 제시하는 추천 행동 카드 덱입니다.
 *
 * U-065 단순화:
 *   - max_length: 10 → 5 (Gemini 스키마 제한 대응, Q2 결정)
 */
export const ActionDeckSchema = z
  .object({
    cards: z.array(ActionCardSchema).max(5).default([]).describe('액션 카드 목록 (3~5장 권장)'),
  })
  .strict();
export type ActionDeck = z.infer<typeof ActionDeckSchema>;

/**
 * Scene 표시 정보 (RU-003-T1: Scene 이미지 SSOT).
 *
 * TurnOutput에서 Scene Canvas에 표시할 이미지 정보를 제공합니다.
 * image_url이 존재하면 SceneCanvas는 'scene' 상태로 전환됩니다.
 * image_url이 없으면 'default' 상태를 유지합니다.
 */
export const SceneOutputSchema = z
  .object({
    image_url: z
      .string()
      .nullable()
      .default(null)
      .describe('Scene 이미지 URL (존재 시 scene 상태로 전환)'),
    alt_text: z.string().nullable().default(null).describe('이미지 대체 텍스트 (접근성용, 선택)'),
  })
  .strict();
export type SceneOutput = z.infer<typeof SceneOutputSchema>;

/**
 * Scene 기본값 (null 대응).
 */
const DEFAULT_SCENE_OUTPUT: SceneOutput = { image_url: null, alt_text: null };

/**
 * UI 출력 데이터 - U-065 단순화.
 * AI가 생성한 UI 요소들입니다.
 * 채팅 버블이 아닌 게임 UI로 표현됩니다 (RULE-002).
 *
 * RU-003-T1: scene 필드 추가 - Scene Canvas의 이미지 표시 정보 SSOT.
 * U-065 단순화: objects 배열 크기 제한 (최대 5개, Q2 결정)
 *
 * 수정: scene 필드는 백엔드에서 null로 올 수 있으므로 nullish()를 사용하여
 * null/undefined 시 기본값으로 변환합니다.
 */
export const UIOutputSchema = z
  .object({
    action_deck: ActionDeckSchema.default({ cards: [] }).describe('액션 카드 덱'),
    objects: z
      .array(SceneObjectSchema)
      .max(5)
      .default([])
      .describe('클릭 가능한 장면 오브젝트 목록 (최대 5개)'),
    scene: SceneOutputSchema.nullish()
      .transform((val) => val ?? DEFAULT_SCENE_OUTPUT)
      .describe('Scene 표시 정보 (RU-003-T1, null 허용)'),
  })
  .strict();
export type UIOutput = z.infer<typeof UIOutputSchema>;

// =============================================================================
// TurnOutput 관련 타입 - World
// =============================================================================

/**
 * 중요 설정 고정 후보.
 * 사용자가 Memory Shard를 소비해 고정할 수 있는 중요 설정입니다.
 */
export const MemoryPinSchema = z
  .object({
    id: z.string().describe('핀 고유 ID'),
    content: z.string().describe('고정할 내용'),
    cost: CurrencyAmountSchema.describe('고정에 필요한 비용'),
  })
  .strict();
export type MemoryPin = z.infer<typeof MemoryPinSchema>;

/**
 * 세계 규칙 (Rule Board).
 * 현재 세계에 적용 중인 물리 법칙이나 메타 규칙입니다.
 */
export const WorldRuleSchema = z
  .object({
    id: z.string().describe('규칙 고유 ID'),
    label: z.string().describe('규칙 이름'),
    description: z.string().nullable().default(null).describe('규칙 상세 설명 (선택)'),
  })
  .strict();
export type WorldRule = z.infer<typeof WorldRuleSchema>;

/**
 * 퀘스트/목표 (Quest Panel) - U-078 목표 시스템 강화.
 * 플레이어가 달성해야 하는 현재 목표입니다.
 * is_main=true인 퀘스트가 주 목표(Main Objective)로 Quest 패널 상단에 강조 표시됩니다.
 */
export const QuestSchema = z
  .object({
    id: z.string().describe('퀘스트 고유 ID'),
    label: z.string().describe('퀘스트 이름'),
    is_completed: z.boolean().default(false).describe('달성 여부'),
    description: z.string().nullable().default(null).describe('목표 상세 설명 (선택)'),
    is_main: z.boolean().default(false).describe('주 목표 여부'),
    progress: z.number().int().min(0).max(100).default(0).describe('진행률 (0~100)'),
    reward_signal: z.number().int().min(0).default(0).describe('달성 시 Signal 보상량'),
  })
  .strict();
export type Quest = z.infer<typeof QuestSchema>;

/**
 * 인벤토리 아이템 데이터 (U-075[Mvp]).
 * TurnOutput에서 추가되는 아이템의 상세 정보입니다.
 */
export const InventoryItemDataSchema = z
  .object({
    id: z.string().describe('아이템 고유 ID'),
    label: z.string().describe('아이템 표시 이름 (현재 언어에 맞게)'),
    description: z.string().default('').describe('아이템 설명 (아이콘 생성용)'),
    icon_url: z.string().nullable().default(null).describe('아이콘 URL (선택, 캐시된 경우)'),
    quantity: z.number().int().min(1).default(1).describe('아이템 수량'),
  })
  .strict();
export type InventoryItemData = z.infer<typeof InventoryItemDataSchema>;

/**
 * 세계 상태 변화 (Q2 결정: Option A - delta 중심) - U-065 단순화.
 * 이번 턴에서 변경된 세계 상태를 나타냅니다.
 *
 * U-065 단순화 (Q3 결정: Option A):
 *   - rules_changed, quests_updated → 배열 크기 제한 (최대 3개)
 *   - memory_pins → 배열 크기 제한 (최대 2개)
 *   - 상세 정보는 narrative에서 자연어로 표현
 */
export const WorldDeltaSchema = z
  .object({
    rules_changed: z
      .array(WorldRuleSchema)
      .max(3)
      .default([])
      .describe('변경된 규칙 목록 (최대 3개)'),
    inventory_added: z
      .array(InventoryItemDataSchema)
      .max(5)
      .default([])
      .describe('추가된 인벤토리 아이템 (최대 5개)'),
    inventory_removed: z
      .array(z.string())
      .max(5)
      .default([])
      .describe('제거된 인벤토리 아이템 (최대 5개)'),
    quests_updated: z
      .array(QuestSchema)
      .max(3)
      .default([])
      .describe('업데이트된 퀘스트/목표 목록 (최대 3개)'),
    relationships_changed: z
      .array(z.string())
      .max(3)
      .default([])
      .describe('변경된 관계 (최대 3개)'),
    memory_pins: z
      .array(MemoryPinSchema)
      .max(2)
      .default([])
      .describe('중요 설정 고정 후보 (최대 2개)'),
  })
  .strict();
export type WorldDelta = z.infer<typeof WorldDeltaSchema>;

// =============================================================================
// TurnOutput 관련 타입 - Render
// =============================================================================

/**
 * 이미지 생성 작업 - U-065 단순화.
 * 조건부 이미지 생성/편집 요청입니다.
 *
 * U-065 단순화: reference_image_ids 배열 크기 제한 (최대 2개)
 * U-091: rembg 런타임 제거 - remove_background, image_type_hint 필드 삭제
 */
export const ImageJobSchema = z
  .object({
    should_generate: z.boolean().describe('이미지를 생성해야 하는지'),
    prompt: z.string().default('').describe('이미지 생성 프롬프트'),
    model_label: ModelLabelSchema.default('FAST').describe('모델 선택 라벨'),
    aspect_ratio: z.string().default('16:9').describe('가로세로 비율'),
    image_size: z.string().default('1024x1024').describe('이미지 크기'),
    reference_image_ids: z
      .array(z.string())
      .max(2)
      .default([])
      .describe('참조 이미지 ID 목록 (최대 2개)'),
    reference_image_url: z
      .string()
      .nullable()
      .default(null)
      .describe('참조 이미지 URL (선택, AI 모델 응답 호환용)'),
  })
  .strict();
export type ImageJob = z.infer<typeof ImageJobSchema>;

/**
 * 렌더링 출력 데이터.
 * 이미지 생성/편집 관련 정보입니다.
 *
 * U-053: image_url, image_id, generation_time_ms 필드 추가 (후처리에서 채움)
 * U-091: rembg 런타임 제거 - background_removed 필드 삭제
 */
export const RenderOutputSchema = z
  .object({
    image_job: ImageJobSchema.nullable().default(null).describe('이미지 생성 작업 (선택)'),
    image_url: z
      .string()
      .nullable()
      .default(null)
      .describe('생성된 이미지 URL (후처리에서 채움, U-053)'),
    image_id: z
      .string()
      .nullable()
      .default(null)
      .describe('생성된 이미지 ID (후처리에서 채움, U-053)'),
    generation_time_ms: z
      .number()
      .int()
      .nullable()
      .default(null)
      .describe('이미지 생성 소요 시간 (ms, U-053)'),
  })
  .strict();
export type RenderOutput = z.infer<typeof RenderOutputSchema>;

// =============================================================================
// TurnOutput 관련 타입 - Economy
// =============================================================================

/**
 * 거래 장부(Ledger) 엔트리 (RULE-005).
 * 각 턴에서 발생한 비용과 잔액 변화를 기록합니다.
 */
export const LedgerEntrySchema = z
  .object({
    turnId: z.number().int().min(0).describe('턴 ID'),
    actionId: z.string().optional().describe('액션 ID (선택)'),
    reason: z.string().describe('비용 발생 사유'),
    cost: CurrencyAmountSchema.describe('소비된 비용'),
    balanceAfter: CurrencyAmountSchema.describe('소비 후 잔액'),
    modelLabel: ModelLabelSchema.optional().describe('모델 라벨 (선택)'),
    timestamp: z.number().describe('기록 시각 (timestamp)'),
  })
  .strict();
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

/**
 * 경제 출력 데이터 (RULE-005).
 * 이번 턴의 비용과 잔액 정보입니다.
 * 잔액 음수는 절대 불가 (서버 Hard gate).
 */
export const EconomyOutputSchema = z
  .object({
    cost: CurrencyAmountSchema.describe('이번 턴에 소비된 비용'),
    balance_after: CurrencyAmountSchema.describe('소비 후 잔액'),
    credit: z.number().int().default(0).describe('사용 중인 크레딧 (빚, Signal 단위)'),
    low_balance_warning: z.boolean().default(false).describe('잔액 부족 경고 여부'),
  })
  .strict();
export type EconomyOutput = z.infer<typeof EconomyOutputSchema>;

// =============================================================================
// TurnOutput 관련 타입 - Safety
// =============================================================================

/**
 * 안전 출력 데이터.
 * 안전 정책 관련 정보입니다.
 * 차단 시 명시적 메시지와 함께 안전한 대체 결과를 제공합니다.
 */
export const SafetyOutputSchema = z
  .object({
    blocked: z.boolean().default(false).describe('안전 정책에 의해 차단되었는지'),
    message: z
      .string()
      .nullable()
      .default(null)
      .describe('차단 시 사용자에게 표시할 메시지 (선택)'),
  })
  .strict();
export type SafetyOutput = z.infer<typeof SafetyOutputSchema>;

// =============================================================================
// TurnOutput 관련 타입 - Agent Console
// =============================================================================

/**
 * 에이전트 콘솔 데이터 (RULE-008) - U-065 단순화.
 * 에이전트형 시스템임을 UI로 증명하기 위한 정보입니다.
 *
 * U-065 단순화: badges 배열 크기 제한 (최대 4개)
 * U-069: model_label 필드 추가 - 현재 사용 중인 텍스트 모델 표시
 */
export const AgentConsoleSchema = z
  .object({
    current_phase: AgentPhaseSchema.default('commit').describe('현재 실행 단계'),
    badges: z.array(ValidationBadgeSchema).max(4).default([]).describe('검증 배지 목록 (최대 4개)'),
    repair_count: z.number().int().min(0).default(0).describe('자동 복구 시도 횟수'),
    model_label: ModelLabelSchema.default('FAST').describe(
      '현재 사용 중인 텍스트 모델 라벨 (U-069)',
    ),
  })
  .strict();
export type AgentConsole = z.infer<typeof AgentConsoleSchema>;

// =============================================================================
// TurnOutput (메인 응답 스키마)
// =============================================================================

/**
 * 턴 출력 (서버 → 클라이언트).
 * 서버가 턴 처리 후 클라이언트로 반환하는 구조화된 응답입니다.
 *
 * Hard Gate 필드 (RULE-003/004/005):
 *   - economy: cost와 balance_after 필수, 잔액 음수 금지
 *   - safety: blocked 시 안전한 대체 결과 제공
 *   - language: 요청 언어와 동일하게 고정 (혼합 출력 금지)
 */
export const TurnOutputSchema = z
  .object({
    // 필수 필드 (Hard Gate)
    language: LanguageSchema.describe('응답 언어 (요청과 동일)'),
    narrative: z.string().describe('내러티브 텍스트 (표시용)'),
    economy: EconomyOutputSchema.describe('경제 정보 (비용, 잔액)'),
    safety: SafetyOutputSchema.describe('안전 정책 정보'),

    // UI 관련 필드 (RU-003-T1: scene 필드 추가)
    ui: UIOutputSchema.default({
      action_deck: { cards: [] },
      objects: [],
      scene: { image_url: null, alt_text: null },
    }).describe('UI 요소'),

    // 세계 상태 필드
    world: WorldDeltaSchema.default({
      rules_changed: [],
      inventory_added: [],
      inventory_removed: [],
      quests_updated: [],
      relationships_changed: [],
      memory_pins: [],
    }).describe('세계 상태 변화 (delta)'),

    // 렌더링 필드
    render: RenderOutputSchema.default({
      image_job: null,
      image_url: null,
      image_id: null,
      generation_time_ms: null,
    }).describe('렌더링 정보'),

    // 에이전트 콘솔 필드
    agent_console: AgentConsoleSchema.default({
      current_phase: 'commit',
      badges: [],
      repair_count: 0,
      model_label: 'FAST',
    }).describe('에이전트 실행 정보'),

    // U-072: 세션 유도를 위한 힌트 필드 (선택)
    hints: z
      .object({
        scanner: z.boolean().optional().describe('Scanner 사용 유도 힌트 여부'),
      })
      .optional()
      .describe('플레이 유도를 위한 힌트 플래그'),
  })
  .strict();
export type TurnOutput = z.infer<typeof TurnOutputSchema>;

// =============================================================================
// 안전 폴백 (RULE-004)
// =============================================================================

/**
 * 검증 실패 시 제공되는 안전 폴백 TurnOutput.
 * UI가 멈추지 않도록 최소한의 정보를 제공합니다.
 *
 * U-063: 폴백에서도 재화 잔액을 유지하도록 economySnapshot 파라미터 추가.
 * RULE-005: 재화 인바리언트 - 폴백 시에도 잔액이 0으로 초기화되지 않아야 함.
 *
 * @param language - 요청 언어
 * @param repairCount - 복구 시도 횟수
 * @param errorMessage - 오류 메시지 (선택)
 * @param economySnapshot - 현재 재화 스냅샷 (선택, 제공 시 잔액 유지)
 */
export function createFallbackTurnOutput(
  language: Language,
  repairCount: number = 0,
  errorMessage?: string,
  economySnapshot?: { signal: number; memory_shard: number },
): TurnOutput {
  const fallbackNarrative =
    language === 'ko-KR'
      ? '[시스템] 응답을 처리하는 중 문제가 발생했습니다. 다시 시도해 주세요.'
      : '[System] An error occurred while processing the response. Please try again.';

  const safetyMessage =
    language === 'ko-KR'
      ? '스키마 검증 실패로 인한 폴백 응답입니다.'
      : 'This is a fallback response due to schema validation failure.';

  // U-063: 폴백에서도 재화 잔액 유지 (RULE-005)
  // economySnapshot이 제공되면 해당 값을 사용, 없으면 기본값 사용
  const balanceAfter = economySnapshot
    ? { signal: economySnapshot.signal, memory_shard: economySnapshot.memory_shard }
    : { signal: 100, memory_shard: 5 }; // 기본값 (프로필 미로드 상태의 placeholder)

  return {
    language,
    narrative: errorMessage ?? fallbackNarrative,
    economy: {
      cost: { signal: 0, memory_shard: 0 },
      balance_after: balanceAfter,
      credit: 0,
      low_balance_warning: false,
    },
    safety: {
      blocked: false,
      message: safetyMessage,
    },
    ui: {
      action_deck: { cards: [] },
      objects: [],
      scene: { image_url: null, alt_text: null },
    },
    world: {
      rules_changed: [],
      inventory_added: [],
      inventory_removed: [],
      quests_updated: [],
      relationships_changed: [],
      memory_pins: [],
    },
    render: {
      image_job: null,
      image_url: null,
      image_id: null,
      generation_time_ms: null,
    },
    agent_console: {
      current_phase: 'commit',
      badges: ['schema_fail'],
      repair_count: repairCount,
      model_label: 'FAST',
    },
  };
}

// =============================================================================
// 검증 헬퍼 함수
// =============================================================================

/**
 * TurnOutput 검증 결과 타입.
 */
export type TurnOutputParseResult =
  | { success: true; data: TurnOutput }
  | { success: false; error: z.ZodError; fallback: TurnOutput };

/**
 * TurnOutput을 안전하게 파싱합니다.
 * 실패 시 폴백 TurnOutput을 반환합니다 (RULE-004).
 *
 * U-063: economySnapshot 파라미터 추가 - 폴백 시에도 재화 잔액 유지.
 *
 * @param data - 파싱할 데이터
 * @param language - 폴백 시 사용할 언어 (기본: ko-KR)
 * @param repairCount - 현재 복구 시도 횟수
 * @param economySnapshot - 현재 재화 스냅샷 (선택, 폴백 시 잔액 유지)
 */
export function safeParseTurnOutput(
  data: unknown,
  language: Language = 'en-US',
  repairCount: number = 0,
  economySnapshot?: { signal: number; memory_shard: number },
): TurnOutputParseResult {
  const result = TurnOutputSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error,
    fallback: createFallbackTurnOutput(language, repairCount, undefined, economySnapshot),
  };
}

/**
 * TurnInput을 검증합니다.
 * 입력 데이터의 유효성을 엄격하게 검사합니다.
 *
 * @param data - 검증할 데이터
 * @throws {z.ZodError} 검증 실패 시
 */
export function parseTurnInput(data: unknown): TurnInput {
  return TurnInputSchema.parse(data);
}

/**
 * TurnInput 안전 파싱 결과 타입.
 */
export type TurnInputSafeParseResult = ReturnType<typeof TurnInputSchema.safeParse>;

/**
 * TurnInput을 안전하게 파싱합니다.
 *
 * @param data - 파싱할 데이터
 */
export function safeParseTurnInput(data: unknown): TurnInputSafeParseResult {
  return TurnInputSchema.safeParse(data);
}
