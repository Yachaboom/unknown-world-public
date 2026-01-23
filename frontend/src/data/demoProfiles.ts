/**
 * Unknown World - 데모 프로필 정의 (U-015[Mvp]).
 *
 * 로그인 없이 즉시 시작 가능한 데모 프로필 3종을 정의합니다.
 * 각 프로필은 서로 다른 초기 상태(재화/인벤토리/퀘스트/룰)를 가집니다.
 *
 * 프로필:
 *   1. Narrator: 내러티브/스토리 중심 체험
 *   2. Explorer: 탐색/발견 중심 체험
 *   3. Tech Enthusiast: 시스템/메커닉 중심 체험
 *
 * 설계 원칙:
 *   - RULE-006: 표시 문자열은 i18n 키 기반
 *   - RULE-010: SaveGame JSON 직렬화로 저장
 *   - PRD 6.9: 데모 프로필 3종 + 즉시 리셋
 *
 * @module data/demoProfiles
 */

import type { SupportedLanguage } from '../i18n';
import type { SaveGame, SaveGameInput } from '../save/saveGame';
import { createSaveGame } from '../save/saveGame';

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
 * SaveGame으로 변환 가능한 구조입니다.
 */
export interface DemoProfileInitialState {
  /** 초기 재화 */
  economy: {
    signal: number;
    memory_shard: number;
  };
  /** 초기 인벤토리 아이템 정의 (ID와 i18n 키) */
  inventoryDefs: Array<{
    id: string;
    nameKey: string;
    icon: string;
    quantity: number;
  }>;
  /** 초기 퀘스트 정의 */
  questDefs: Array<{
    id: string;
    labelKey: string;
    is_completed: boolean;
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
        is_completed: false,
      },
      {
        id: 'quest-collect-memories',
        labelKey: 'profile.narrator.quest.collect_memories',
        is_completed: false,
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
    sceneObjectDefs: [
      {
        id: 'mysterious-bookshelf',
        labelKey: 'profile.narrator.scene.bookshelf',
        hintKey: 'profile.narrator.scene.bookshelf_hint',
        box_2d: { ymin: 200, xmin: 100, ymax: 700, xmax: 400 },
      },
      {
        id: 'glowing-portal',
        labelKey: 'profile.narrator.scene.portal',
        hintKey: 'profile.narrator.scene.portal_hint',
        box_2d: { ymin: 300, xmin: 600, ymax: 800, xmax: 900 },
      },
    ],
    welcomeMessageKey: 'profile.narrator.welcome',
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
      { id: 'quest-find-exit', labelKey: 'profile.explorer.quest.find_exit', is_completed: false },
      {
        id: 'quest-explore-areas',
        labelKey: 'profile.explorer.quest.explore_areas',
        is_completed: false,
      },
      {
        id: 'quest-gather-supplies',
        labelKey: 'profile.explorer.quest.gather_supplies',
        is_completed: true,
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
    sceneObjectDefs: [
      {
        id: 'ancient-door',
        labelKey: 'profile.explorer.scene.door',
        hintKey: 'profile.explorer.scene.door_hint',
        box_2d: { ymin: 150, xmin: 400, ymax: 850, xmax: 600 },
      },
      {
        id: 'strange-mechanism',
        labelKey: 'profile.explorer.scene.mechanism',
        hintKey: 'profile.explorer.scene.mechanism_hint',
        box_2d: { ymin: 500, xmin: 100, ymax: 700, xmax: 300 },
      },
      {
        id: 'hidden-passage',
        labelKey: 'profile.explorer.scene.passage',
        hintKey: 'profile.explorer.scene.passage_hint',
        box_2d: { ymin: 600, xmin: 700, ymax: 800, xmax: 950 },
      },
    ],
    welcomeMessageKey: 'profile.explorer.welcome',
  },
};

/**
 * Tech Enthusiast 프로필: 시스템/메커닉 중심 체험.
 * 제한된 재화로 효율적인 전략을 세워야 합니다.
 */
export const PROFILE_TECH: DemoProfile = {
  id: 'tech',
  nameKey: 'profile.tech.name',
  descriptionKey: 'profile.tech.description',
  icon: '⚙️',
  themeColor: 'var(--warning-color)',
  initialState: {
    economy: {
      signal: 80,
      memory_shard: 15,
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
        is_completed: false,
      },
      {
        id: 'quest-optimize-resources',
        labelKey: 'profile.tech.quest.optimize_resources',
        is_completed: false,
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
    sceneObjectDefs: [
      {
        id: 'main-terminal',
        labelKey: 'profile.tech.scene.terminal',
        hintKey: 'profile.tech.scene.terminal_hint',
        box_2d: { ymin: 200, xmin: 300, ymax: 600, xmax: 700 },
      },
      {
        id: 'power-conduit',
        labelKey: 'profile.tech.scene.conduit',
        hintKey: 'profile.tech.scene.conduit_hint',
        box_2d: { ymin: 100, xmin: 50, ymax: 400, xmax: 200 },
      },
    ],
    welcomeMessageKey: 'profile.tech.welcome',
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

// =============================================================================
// 프로필 → SaveGameInput 변환 (RU-004-Q1: SSOT 단일화)
// =============================================================================

/**
 * 데모 프로필을 SaveGameInput으로 변환합니다.
 *
 * RU-004-Q1: SaveGame 생성은 createSaveGame(SSOT)만 수행하도록 분리.
 * 이 함수는 "입력 변환(input adapter)" 역할만 담당합니다.
 *
 * @param profile - 데모 프로필
 * @param language - 언어 설정
 * @param t - i18n 번역 함수
 * @returns SaveGameInput 객체 (createSaveGame에 전달 가능)
 */
export function profileToSaveGameInput(
  profile: DemoProfile,
  language: SupportedLanguage,
  t: (key: string) => string,
): SaveGameInput {
  const now = Date.now();

  return {
    language,
    profileId: profile.id,
    seed: `demo-${profile.id}-${now}`,
    economy: {
      signal: profile.initialState.economy.signal,
      memory_shard: profile.initialState.economy.memory_shard,
    },
    economyLedger: [],
    turnCount: 0,
    narrativeHistory: [
      {
        turn: 0,
        text: t(profile.initialState.welcomeMessageKey),
      },
    ],
    inventory: profile.initialState.inventoryDefs.map((item) => ({
      id: item.id,
      name: t(item.nameKey),
      icon: item.icon,
      quantity: item.quantity,
    })),
    quests: profile.initialState.questDefs.map((quest) => ({
      id: quest.id,
      label: t(quest.labelKey),
      is_completed: quest.is_completed,
    })),
    activeRules: profile.initialState.ruleDefs.map((rule) => ({
      id: rule.id,
      label: t(rule.labelKey),
      description: rule.descriptionKey ? t(rule.descriptionKey) : null,
    })),
    mutationTimeline: profile.initialState.ruleDefs.map((rule, index) => ({
      turn: 0,
      ruleId: rule.id,
      type: 'added' as const,
      label: t(rule.labelKey),
      description: rule.descriptionKey ? t(rule.descriptionKey) : undefined,
      timestamp: now - index * 1000,
    })),
    sceneObjects: profile.initialState.sceneObjectDefs.map((obj) => ({
      id: obj.id,
      label: t(obj.labelKey),
      box_2d: obj.box_2d,
      interaction_hint: t(obj.hintKey),
    })),
  };
}

/**
 * 데모 프로필을 SaveGame 형태로 변환합니다.
 *
 * RU-004-Q1: createSaveGame(SSOT)를 호출하는 얇은 wrapper입니다.
 * 기존 호출자와의 호환성을 유지합니다.
 *
 * @param profile - 데모 프로필
 * @param language - 언어 설정
 * @param t - i18n 번역 함수
 * @returns SaveGame 객체
 */
export function createSaveGameFromProfile(
  profile: DemoProfile,
  language: SupportedLanguage,
  t: (key: string) => string,
): SaveGame {
  return createSaveGame(profileToSaveGameInput(profile, language, t));
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
