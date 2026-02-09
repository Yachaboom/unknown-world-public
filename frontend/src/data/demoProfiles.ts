/**
 * Unknown World - 데모 프로필 정의 (U-015[Mvp], U-116[Mvp]).
 *
 * 로그인 없이 즉시 시작 가능한 데모 프로필 3종을 정의합니다.
 * 각 프로필은 서로 다른 초기 상태(재화/인벤토리/퀘스트/룰)를 가집니다.
 *
 * U-116: SaveGame 중간 단계 제거. 프로필 데이터는 sessionLifecycle에서
 * store에 직접 적용됩니다.
 *
 * 프로필:
 *   1. Narrator: 내러티브/스토리 중심 체험
 *   2. Explorer: 탐색/발견 중심 체험
 *   3. Tech Enthusiast: 시스템/메커닉 중심 체험
 *
 * 설계 원칙:
 *   - RULE-006: 표시 문자열은 i18n 키 기반
 *   - PRD 6.9: 데모 프로필 3종 + 즉시 리셋
 *
 * @module data/demoProfiles
 */

// =============================================================================
// 프로필 타입 정의
// =============================================================================

/**
 * 데모 프로필 정의 (언어 중립).
 * 표시용 문자열은 i18n 키로 참조합니다.
 */
export interface DemoProfileDef {
  /** 프로필 고유 ID */
  id: string;
  /** 프로필 이름 i18n 키 */
  nameKey: string;
  /** 프로필 설명 i18n 키 */
  descriptionKey: string;
  /** 프로필 아이콘 (이모지) */
  icon: string;
  /** 프로필 테마 색상 (CSS 변수명 또는 hex) */
  themeColor: string;
}

/**
 * 프로필 초기 상태.
 * sessionLifecycle에서 store에 직접 적용됩니다.
 */
export interface DemoProfileInitialState {
  /** 초기 재화 */
  economy: {
    signal: number;
    memory_shard: number;
    credit: number;
  };
  /** 초기 인벤토리 아이템 정의 (ID와 i18n 키) */
  inventoryDefs: Array<{
    id: string;
    nameKey: string;
    icon: string;
    quantity: number;
  }>;
  /** 초기 퀘스트 정의 (U-078: 목표 시스템 강화) */
  questDefs: Array<{
    id: string;
    labelKey: string;
    is_completed: boolean;
    descriptionKey?: string;
    is_main?: boolean;
    progress?: number;
    reward_signal?: number;
  }>;
  /** 초기 규칙 정의 */
  ruleDefs: Array<{
    id: string;
    labelKey: string;
    descriptionKey?: string;
  }>;
  /** 초기 Scene Objects 정의 */
  sceneObjectDefs: Array<{
    id: string;
    labelKey: string;
    hintKey: string;
    box_2d: {
      ymin: number;
      xmin: number;
      ymax: number;
      xmax: number;
    };
  }>;
  /** 환영 메시지 i18n 키 */
  welcomeMessageKey: string;
  /**
   * 사전 생성 첫 씬 이미지 경로 (U-124).
   * nanobanana mcp로 제작한 정적 에셋을 가리킵니다.
   * 프로필 시작 시 Scene Canvas에 즉시 표시됩니다.
   */
  initialSceneImageUrl?: string;
  /**
   * 초기 씬 설명 텍스트 (U-133: 이미지-스토리 정합성).
   * 사전 생성 이미지의 시각적 요소를 텍스트로 기술합니다.
   * 첫 턴(turnCount===0) 요청 시 GM 프롬프트에 맥락으로 주입되어,
   * 환영 메시지 → 이미지 → 첫 턴 내러티브가 자연스럽게 이어지게 합니다.
   * ko/en 양 언어를 포함하여 세션 언어에 따라 적절한 버전이 사용됩니다.
   */
  initialSceneDescription?: {
    ko: string;
    en: string;
  };
}

/**
 * 데모 프로필 전체 정의.
 */
export interface DemoProfile extends DemoProfileDef {
  initialState: DemoProfileInitialState;
}

// =============================================================================
// 데모 프로필 정의 (3종)
// =============================================================================

/**
 * Narrator 프로필: 내러티브/스토리 중심 체험.
 * 풍부한 재화로 다양한 선택지를 탐색할 수 있습니다.
 */
export const PROFILE_NARRATOR: DemoProfile = {
  id: 'narrator',
  nameKey: 'profile.narrator.name',
  descriptionKey: 'profile.narrator.description',
  icon: '📖',
  themeColor: 'var(--accent-color)',
  initialState: {
    economy: {
      signal: 200,
      memory_shard: 10,
      credit: 0,
    },
    inventoryDefs: [
      {
        id: 'ancient-tome',
        nameKey: 'profile.narrator.items.ancient_tome',
        icon: '📕',
        quantity: 1,
      },
      { id: 'quill-pen', nameKey: 'profile.narrator.items.quill_pen', icon: '🖋️', quantity: 1 },
      {
        id: 'memory-fragment',
        nameKey: 'profile.narrator.items.memory_fragment',
        icon: '💠',
        quantity: 3,
      },
    ],
    questDefs: [
      {
        id: 'quest-discover-origin',
        labelKey: 'profile.narrator.quest.discover_origin',
        descriptionKey: 'profile.narrator.quest.discover_origin_desc',
        is_completed: false,
        is_main: true,
        progress: 0,
        reward_signal: 50,
      },
      {
        id: 'quest-collect-memories',
        labelKey: 'profile.narrator.quest.collect_memories',
        is_completed: false,
        reward_signal: 15,
      },
      {
        id: 'quest-read-ancient-tome',
        labelKey: 'profile.narrator.quest.read_ancient_tome',
        is_completed: false,
        reward_signal: 10,
      },
    ],
    ruleDefs: [
      {
        id: 'rule-time-flows',
        labelKey: 'profile.narrator.rule.time_flows',
        descriptionKey: 'profile.narrator.rule.time_flows_desc',
      },
      {
        id: 'rule-memories-persist',
        labelKey: 'profile.narrator.rule.memories_persist',
        descriptionKey: 'profile.narrator.rule.memories_persist_desc',
      },
    ],
    // U-116: 초기 핫스팟 제거 (U-090 정밀분석 전용 정책 준수)
    sceneObjectDefs: [],
    welcomeMessageKey: 'profile.narrator.welcome',
    // U-124: 사전 생성 첫 씬 이미지 (nanobanana mcp, 서재/도서관)
    initialSceneImageUrl: '/ui/scenes/scene-narrator-start.webp',
    // U-133: 초기 씬 설명 (이미지-스토리 정합성)
    initialSceneDescription: {
      ko: '먼지가 쌓인 고풍스러운 서재. 흔들리는 촛불이 수백 권의 고서를 비추고, 큰 참나무 책상 위에 두루마리가 펼쳐져 있다. 달빛이 고딕 양식의 창문을 통해 스며들며, 공기 중에 오래된 양피지와 잉크 냄새가 떠돈다. 서가 사이로 희미한 빛이 맥동하듯 깜빡인다.',
      en: 'A dust-laden, antiquated study. Flickering candlelight illuminates hundreds of ancient tomes, and a scroll lies unrolled on a great oak desk. Moonlight seeps through gothic windows, and the air carries the scent of aged parchment and ink. Between the shelves, a faint light pulses like a quiet heartbeat.',
    },
  },
};

/**
 * Explorer 프로필: 탐색/발견 중심 체험.
 * 적당한 재화와 탐색 도구로 새로운 영역을 발견합니다.
 */
export const PROFILE_EXPLORER: DemoProfile = {
  id: 'explorer',
  nameKey: 'profile.explorer.name',
  descriptionKey: 'profile.explorer.description',
  icon: '🧭',
  themeColor: 'var(--text-color)',
  initialState: {
    economy: {
      signal: 150,
      memory_shard: 5,
      credit: 0,
    },
    inventoryDefs: [
      { id: 'compass', nameKey: 'profile.explorer.items.compass', icon: '🧭', quantity: 1 },
      { id: 'rope', nameKey: 'profile.explorer.items.rope', icon: '🪢', quantity: 2 },
      { id: 'lantern', nameKey: 'profile.explorer.items.lantern', icon: '🏮', quantity: 1 },
      {
        id: 'map-fragment',
        nameKey: 'profile.explorer.items.map_fragment',
        icon: '🗺️',
        quantity: 1,
      },
    ],
    questDefs: [
      {
        id: 'quest-find-exit',
        labelKey: 'profile.explorer.quest.find_exit',
        descriptionKey: 'profile.explorer.quest.find_exit_desc',
        is_completed: false,
        is_main: true,
        progress: 15,
        reward_signal: 50,
      },
      {
        id: 'quest-explore-areas',
        labelKey: 'profile.explorer.quest.explore_areas',
        is_completed: false,
        reward_signal: 20,
      },
      {
        id: 'quest-gather-supplies',
        labelKey: 'profile.explorer.quest.gather_supplies',
        is_completed: true,
        reward_signal: 10,
      },
    ],
    ruleDefs: [
      {
        id: 'rule-gravity',
        labelKey: 'profile.explorer.rule.gravity',
        descriptionKey: 'profile.explorer.rule.gravity_desc',
      },
      {
        id: 'rule-darkness',
        labelKey: 'profile.explorer.rule.darkness',
        descriptionKey: 'profile.explorer.rule.darkness_desc',
      },
    ],
    // U-116: 초기 핫스팟 제거 (U-090 정밀분석 전용 정책 준수)
    sceneObjectDefs: [],
    welcomeMessageKey: 'profile.explorer.welcome',
    // U-124: 사전 생성 첫 씬 이미지 (nanobanana mcp, 동굴 입구)
    initialSceneImageUrl: '/ui/scenes/scene-explorer-start.webp',
    // U-133: 초기 씬 설명 (이미지-스토리 정합성)
    initialSceneDescription: {
      ko: '미지의 동굴 입구. 횃불이 안개 사이로 흔들리고, 신비한 문양이 새겨진 석조 기둥이 양쪽에 서 있다. 동굴 안쪽에서 희미한 바람이 불어오며, 벽면의 이끼 사이로 물방울이 떨어진다. 어둠 너머로 무언가가 반짝이는 듯하다.',
      en: 'The mouth of an uncharted cave. Torchlight wavers through drifting mist, and stone pillars carved with enigmatic symbols stand on either side. A faint breeze drifts from deeper within, and water droplets fall between patches of moss on the walls. Something seems to glint beyond the darkness.',
    },
  },
};

/**
 * Tech Enthusiast 프로필: 시스템/메커닉 중심 체험.
 * U-137: Signal 150으로 상향 — 10분 데모(15~25턴) 동안 재화 걱정 없이 플레이.
 */
export const PROFILE_TECH: DemoProfile = {
  id: 'tech',
  nameKey: 'profile.tech.name',
  descriptionKey: 'profile.tech.description',
  icon: '⚙️',
  themeColor: 'var(--warning-color)',
  initialState: {
    economy: {
      signal: 150,
      memory_shard: 15,
      credit: 0,
    },
    inventoryDefs: [
      { id: 'data-core', nameKey: 'profile.tech.items.data_core', icon: '💿', quantity: 1 },
      { id: 'circuit-board', nameKey: 'profile.tech.items.circuit_board', icon: '🔌', quantity: 2 },
      { id: 'energy-cell', nameKey: 'profile.tech.items.energy_cell', icon: '🔋', quantity: 3 },
      { id: 'scanner-device', nameKey: 'profile.tech.items.scanner', icon: '📡', quantity: 1 },
    ],
    questDefs: [
      {
        id: 'quest-analyze-system',
        labelKey: 'profile.tech.quest.analyze_system',
        descriptionKey: 'profile.tech.quest.analyze_system_desc',
        is_completed: false,
        is_main: true,
        progress: 0,
        reward_signal: 40,
      },
      {
        id: 'quest-optimize-resources',
        labelKey: 'profile.tech.quest.optimize_resources',
        is_completed: false,
        reward_signal: 15,
      },
      {
        id: 'quest-scan-terminal',
        labelKey: 'profile.tech.quest.scan_terminal',
        is_completed: false,
        reward_signal: 10,
      },
    ],
    ruleDefs: [
      {
        id: 'rule-energy-conservation',
        labelKey: 'profile.tech.rule.energy_conservation',
        descriptionKey: 'profile.tech.rule.energy_conservation_desc',
      },
      {
        id: 'rule-data-integrity',
        labelKey: 'profile.tech.rule.data_integrity',
        descriptionKey: 'profile.tech.rule.data_integrity_desc',
      },
      {
        id: 'rule-system-limits',
        labelKey: 'profile.tech.rule.system_limits',
        descriptionKey: 'profile.tech.rule.system_limits_desc',
      },
    ],
    // U-116: 초기 핫스팟 제거 (U-090 정밀분석 전용 정책 준수)
    sceneObjectDefs: [],
    welcomeMessageKey: 'profile.tech.welcome',
    // U-124: 사전 생성 첫 씬 이미지 (nanobanana mcp, 실험실)
    initialSceneImageUrl: '/ui/scenes/scene-tech-start.webp',
    // U-133: 초기 씬 설명 (이미지-스토리 정합성)
    initialSceneDescription: {
      ko: '첨단 실험실. 홀로그래픽 디스플레이가 공중에 떠 있고, 회로 기판과 빛나는 튜브가 벽을 따라 늘어서 있다. 중앙의 제어 패널이 청록색 빛을 내뿜으며, 기계음이 리듬처럼 울린다. 천장의 데이터 스트림이 폭포처럼 쏟아지고 있다.',
      en: 'A cutting-edge laboratory. Holographic displays hover in midair, and circuit boards with glowing tubes line the walls. The central control panel emits a teal glow, and the hum of machinery pulses rhythmically. Streams of data cascade from the ceiling like a digital waterfall.',
    },
  },
};

/**
 * 모든 데모 프로필 목록.
 */
export const DEMO_PROFILES: readonly DemoProfile[] = [
  PROFILE_NARRATOR,
  PROFILE_EXPLORER,
  PROFILE_TECH,
] as const;

/**
 * 프로필 ID로 프로필을 찾습니다.
 */
export function findProfileById(profileId: string): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.id === profileId);
}

/**
 * 프로필 목록 정보만 가져옵니다 (선택 UI용).
 */
export function getProfileSummaries(): Array<DemoProfileDef> {
  return DEMO_PROFILES.map((p) => ({
    id: p.id,
    nameKey: p.nameKey,
    descriptionKey: p.descriptionKey,
    icon: p.icon,
    themeColor: p.themeColor,
  }));
}
