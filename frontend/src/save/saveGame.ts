/**
 * Unknown World - SaveGame 저장/복원 모듈 (U-015[Mvp]).
 *
 * 로그인 없이 즉시 시작 가능한 데모 프로필과 세이브/로드 기능을 제공합니다.
 * DB 없이 SaveGame JSON 직렬화 기반으로 localStorage에 저장합니다.
 *
 * 설계 원칙:
 *   - RULE-010: DB/ORM 도입 금지 (SaveGame JSON 직렬화 기반)
 *   - RULE-006: language 필드로 ko/en 혼합 방지
 *   - Q1 결정: Option A - localStorage 사용 (단순/데모 적합)
 *
 * @module save/saveGame
 */

import { z } from 'zod';
import type { SupportedLanguage } from '../i18n';
import type { LedgerEntry } from '../stores/economyStore';
import type { Quest, WorldRule } from '../schemas/turn';
import type { InventoryItem } from '../stores/inventoryStore';
import type { MutationEvent, NarrativeEntry, EconomyState } from '../stores/worldStore';
import type { SceneObject } from '../schemas/turn';

// =============================================================================
// 버전 및 상수
// =============================================================================

/**
 * 현재 SaveGame 스키마 버전.
 * 버전이 바뀌어도 복원 가능하도록 version 필드를 필수로 둡니다.
 */
export const SAVEGAME_VERSION = '1.0.0' as const;

/** localStorage 키 */
export const SAVEGAME_STORAGE_KEY = 'unknown_world_savegame' as const;

/** 현재 선택된 프로필 키 */
export const CURRENT_PROFILE_KEY = 'unknown_world_current_profile' as const;

// =============================================================================
// SaveGame 스키마 정의
// =============================================================================

/**
 * SaveGame Zod 스키마.
 * 최소 필드만 포함하여 MVP 요구사항을 충족합니다.
 */
export const SaveGameSchema = z
  .object({
    /** 스키마 버전 (마이그레이션용) */
    version: z.string().describe('SaveGame 스키마 버전'),
    /** 세션 시드 (리플레이 재현용, 선택) */
    seed: z.string().nullable().default(null).describe('세션 시드'),
    /** 언어 설정 (RULE-006: 복원 시 UI i18n에도 적용) */
    language: z.enum(['ko-KR', 'en-US']).describe('언어 설정'),
    /** 사용된 데모 프로필 ID */
    profileId: z.string().nullable().default(null).describe('데모 프로필 ID'),
    /** 저장 시각 (ISO 8601) */
    savedAt: z.string().describe('저장 시각'),

    /** 재화 상태 */
    economy: z
      .object({
        signal: z.number().int().min(0),
        memory_shard: z.number().int().min(0),
      })
      .describe('재화 상태'),

    /** 경제 원장 이력 */
    economyLedger: z
      .array(
        z.object({
          turnId: z.number().int(),
          actionId: z.string().optional(),
          reason: z.string(),
          cost: z.object({
            signal: z.number().int().min(0),
            memory_shard: z.number().int().min(0),
          }),
          balanceAfter: z.object({
            signal: z.number().int().min(0),
            memory_shard: z.number().int().min(0),
          }),
          modelLabel: z.enum(['FAST', 'QUALITY', 'CHEAP', 'REF']).optional(),
          timestamp: z.number(),
        }),
      )
      .default([])
      .describe('경제 원장 이력'),

    /** 현재 턴 카운트 */
    turnCount: z.number().int().min(0).default(0).describe('현재 턴 카운트'),

    /** 내러티브 히스토리 */
    narrativeHistory: z
      .array(
        z.object({
          turn: z.number().int(),
          text: z.string(),
        }),
      )
      .default([])
      .describe('내러티브 히스토리'),

    /** 인벤토리 아이템 */
    inventory: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          icon: z.string().optional(),
          quantity: z.number().int().min(1),
        }),
      )
      .default([])
      .describe('인벤토리 아이템'),

    /** 활성 퀘스트 */
    quests: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          is_completed: z.boolean().default(false),
        }),
      )
      .default([])
      .describe('활성 퀘스트'),

    /** 활성 규칙 */
    activeRules: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          description: z.string().nullable().default(null),
        }),
      )
      .default([])
      .describe('활성 규칙'),

    /** 룰 변형 타임라인 */
    mutationTimeline: z
      .array(
        z.object({
          turn: z.number().int(),
          ruleId: z.string(),
          type: z.enum(['added', 'modified', 'removed']),
          label: z.string(),
          description: z.string().optional(),
          timestamp: z.number(),
        }),
      )
      .default([])
      .describe('룰 변형 타임라인'),

    /** Scene Objects (핫스팟) */
    sceneObjects: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          box_2d: z.object({
            ymin: z.number().int().min(0).max(1000),
            xmin: z.number().int().min(0).max(1000),
            ymax: z.number().int().min(0).max(1000),
            xmax: z.number().int().min(0).max(1000),
          }),
          interaction_hint: z.string().nullable().default(null),
        }),
      )
      .default([])
      .describe('Scene Objects'),
  })
  .strict();

export type SaveGame = z.infer<typeof SaveGameSchema>;

// =============================================================================
// 저장/복원 함수
// =============================================================================

/**
 * SaveGame 인터페이스 (저장할 상태 전체를 캡처).
 */
export interface SaveGameInput {
  language: SupportedLanguage;
  profileId?: string | null;
  seed?: string | null;
  economy: EconomyState;
  economyLedger: LedgerEntry[];
  turnCount: number;
  narrativeHistory: NarrativeEntry[];
  inventory: InventoryItem[];
  quests: Quest[];
  activeRules: WorldRule[];
  mutationTimeline: MutationEvent[];
  sceneObjects: SceneObject[];
}

/**
 * 현재 상태를 SaveGame 객체로 직렬화합니다.
 */
export function createSaveGame(input: SaveGameInput): SaveGame {
  return {
    version: SAVEGAME_VERSION,
    seed: input.seed ?? null,
    language: input.language,
    profileId: input.profileId ?? null,
    savedAt: new Date().toISOString(),
    economy: {
      signal: input.economy.signal,
      memory_shard: input.economy.memory_shard,
    },
    economyLedger: input.economyLedger.map((entry) => ({
      turnId: entry.turnId,
      actionId: entry.actionId,
      reason: entry.reason,
      cost: {
        signal: entry.cost.signal,
        memory_shard: entry.cost.memory_shard,
      },
      balanceAfter: {
        signal: entry.balanceAfter.signal,
        memory_shard: entry.balanceAfter.memory_shard,
      },
      modelLabel: entry.modelLabel,
      timestamp: entry.timestamp,
    })),
    turnCount: input.turnCount,
    narrativeHistory: input.narrativeHistory.map((entry) => ({
      turn: entry.turn,
      text: entry.text,
    })),
    inventory: input.inventory.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      quantity: item.quantity,
    })),
    quests: input.quests.map((quest) => ({
      id: quest.id,
      label: quest.label,
      is_completed: quest.is_completed,
    })),
    activeRules: input.activeRules.map((rule) => ({
      id: rule.id,
      label: rule.label,
      description: rule.description,
    })),
    mutationTimeline: input.mutationTimeline.map((event) => ({
      turn: event.turn,
      ruleId: event.ruleId,
      type: event.type,
      label: event.label,
      description: event.description,
      timestamp: event.timestamp,
    })),
    sceneObjects: input.sceneObjects.map((obj) => ({
      id: obj.id,
      label: obj.label,
      box_2d: {
        ymin: obj.box_2d.ymin,
        xmin: obj.box_2d.xmin,
        ymax: obj.box_2d.ymax,
        xmax: obj.box_2d.xmax,
      },
      interaction_hint: obj.interaction_hint,
    })),
  };
}

/**
 * SaveGame을 localStorage에 저장합니다.
 *
 * @returns 저장 성공 여부
 */
export function saveSaveGame(saveGame: SaveGame): boolean {
  try {
    const json = JSON.stringify(saveGame);
    localStorage.setItem(SAVEGAME_STORAGE_KEY, json);
    return true;
  } catch (error) {
    console.error('[SaveGame] 저장 실패:', error);
    return false;
  }
}

/**
 * localStorage에서 SaveGame을 로드합니다.
 * 마이그레이션이 필요한 경우 자동으로 적용합니다 (RU-004-S2).
 *
 * @returns SaveGame 객체 또는 null (없거나 유효하지 않은 경우)
 */
export function loadSaveGame(): SaveGame | null {
  try {
    const json = localStorage.getItem(SAVEGAME_STORAGE_KEY);
    if (!json) {
      return null;
    }

    const parsed = JSON.parse(json);
    const result = SaveGameSchema.safeParse(parsed);

    if (!result.success) {
      console.warn('[SaveGame] 스키마 검증 실패:', result.error);
      return null;
    }

    // RU-004-S2: 버전 마이그레이션 적용
    const migrated = migrateSaveGame(result.data);
    if (!migrated) {
      console.warn('[SaveGame] 마이그레이션 실패, 새로 시작 필요');
      return null;
    }

    return migrated;
  } catch (error) {
    console.error('[SaveGame] 로드 실패:', error);
    return null;
  }
}

/**
 * 저장된 SaveGame을 삭제합니다.
 */
export function clearSaveGame(): void {
  try {
    localStorage.removeItem(SAVEGAME_STORAGE_KEY);
  } catch (error) {
    console.error('[SaveGame] 삭제 실패:', error);
  }
}

/**
 * SaveGame이 존재하는지 확인합니다.
 *
 * @deprecated RU-004-S2: 이 함수는 키 존재만 확인하므로 "유효한 세이브" 판단에 부적합합니다.
 *             대신 `getValidSaveGameOrNull()`을 사용하세요.
 */
export function hasSaveGame(): boolean {
  try {
    return localStorage.getItem(SAVEGAME_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * 유효한 SaveGame을 반환합니다. 없거나 검증/마이그레이션 실패 시 null을 반환합니다 (RU-004-S2).
 *
 * `hasSaveGame()` 대신 이 함수를 사용하면 "Continue 버튼 노출" 판단이 정확해집니다:
 * - localStorage에 데이터가 있어도 스키마 검증 실패 시 null 반환
 * - 버전 불일치로 마이그레이션 실패 시 null 반환
 *
 * @returns 유효한 SaveGame 또는 null
 */
export function getValidSaveGameOrNull(): SaveGame | null {
  return loadSaveGame();
}

// =============================================================================
// 프로필 관련 유틸리티
// =============================================================================

/**
 * 현재 선택된 프로필 ID를 저장합니다.
 */
export function saveCurrentProfileId(profileId: string): void {
  try {
    localStorage.setItem(CURRENT_PROFILE_KEY, profileId);
  } catch (error) {
    console.error('[SaveGame] 프로필 ID 저장 실패:', error);
  }
}

/**
 * 현재 선택된 프로필 ID를 로드합니다.
 */
export function loadCurrentProfileId(): string | null {
  try {
    return localStorage.getItem(CURRENT_PROFILE_KEY);
  } catch {
    return null;
  }
}

/**
 * 현재 선택된 프로필 ID를 삭제합니다.
 */
export function clearCurrentProfileId(): void {
  try {
    localStorage.removeItem(CURRENT_PROFILE_KEY);
  } catch (error) {
    console.error('[SaveGame] 프로필 ID 삭제 실패:', error);
  }
}

// =============================================================================
// 버전 마이그레이션 (향후 확장)
// =============================================================================

/**
 * SaveGame 버전을 확인하고 필요 시 마이그레이션합니다.
 * 현재는 v1.0.0만 지원하므로 패스스루입니다.
 *
 * @param saveGame - 로드된 SaveGame
 * @returns 마이그레이션된 SaveGame 또는 null (마이그레이션 불가)
 */
export function migrateSaveGame(saveGame: SaveGame): SaveGame | null {
  // 현재 버전이면 그대로 반환
  if (saveGame.version === SAVEGAME_VERSION) {
    return saveGame;
  }

  // 향후 버전 업그레이드 시 마이그레이션 로직 추가
  console.warn(`[SaveGame] 버전 불일치: ${saveGame.version} -> ${SAVEGAME_VERSION}`);

  // MVP에서는 버전 불일치 시 null 반환 (새로 시작 유도)
  return null;
}
