/**
 * Unknown World - 세션 라이프사이클 관리 모듈 (RU-004-Q4).
 *
 * 세션 초기화/복원/리셋/변경을 SSOT로 관리합니다.
 * App.tsx의 세션 관련 로직을 이 모듈로 이동하여 책임 경계를 명확히 합니다.
 *
 * 설계 원칙:
 *   - RULE-005: Economy 인바리언트 (잔액 음수 금지)
 *   - RULE-006: ko/en i18n 정책 준수 (언어 적용 후 UI 렌더링)
 *   - RU-004-S1: 언어 async 적용 완료 후 store 주입
 *   - RU-004-S2: profileId SSOT + 유효 SaveGame만 Continue
 *
 * @module save/sessionLifecycle
 */

import {
  loadSaveGame,
  saveSaveGame,
  clearSaveGame,
  getValidSaveGameOrNull,
  createSaveGame,
  loadCurrentProfileId,
  saveCurrentProfileId,
  clearCurrentProfileId,
} from './saveGame';
import { findProfileById, createSaveGameFromProfile, type DemoProfile } from '../data/demoProfiles';
import { getResolvedLanguage, changeLanguage, type SupportedLanguage } from '../i18n';
import { useWorldStore } from '../stores/worldStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useEconomyStore } from '../stores/economyStore';
import { useActionDeckStore } from '../stores/actionDeckStore';
import { useAgentStore } from '../stores/agentStore';

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 부팅 결과 타입.
 * 앱 시작 시 어떤 phase로 시작할지 결정합니다.
 */
export type SessionBootstrap =
  | { phase: 'profile_select'; savedGameAvailable: boolean }
  | { phase: 'playing'; profileId: string | null };

/**
 * 세션 시작 결과 타입.
 */
export interface SessionStartResult {
  success: true;
  profileId: string;
}

/**
 * 세션 복원 결과 타입.
 */
export interface SessionContinueResult {
  success: true;
  profileId: string;
}

/**
 * 세션 리셋 결과 타입.
 */
export interface SessionResetResult {
  success: boolean;
  profileId: string | null;
}

// =============================================================================
// 내부 헬퍼: 모든 세션 관련 store를 초기화
// =============================================================================

/**
 * 모든 세션 관련 store를 초기화합니다.
 *
 * RU-004-Q4 Step 2: store reset/hydrate 범위 표준화
 * - worldStore, inventoryStore, economyStore, actionDeckStore, agentStore
 *
 * 세션 경계에서 항상 이 함수를 호출하여 이전 세션 잔재를 완전히 제거합니다.
 */
function resetAllSessionStores(): void {
  useWorldStore.getState().reset();
  useInventoryStore.getState().reset();
  useEconomyStore.getState().reset();
  useActionDeckStore.getState().reset();
  useAgentStore.getState().reset();
}

// =============================================================================
// 세션 라이프사이클 API
// =============================================================================

/**
 * 부팅 시 세션 상태를 확인하고 시작 phase를 결정합니다.
 *
 * RU-004-S2: hasSaveGame() 대신 getValidSaveGameOrNull()로 "유효한 세이브만" 판단
 *
 * @returns SessionBootstrap - 시작 phase와 관련 정보
 */
export function bootstrapSession(): SessionBootstrap {
  const validSaveGame = getValidSaveGameOrNull();

  if (validSaveGame) {
    // 유효한 세이브가 있으면 playing 상태로 시작
    return {
      phase: 'playing',
      profileId: validSaveGame.profileId,
    };
  }

  // 유효한 세이브가 없으면 profile_select로 시작
  // 단, localStorage에 깨진 세이브가 있을 수 있으므로 savedGameAvailable은 false
  return {
    phase: 'profile_select',
    savedGameAvailable: false,
  };
}

/**
 * 저장된 게임이 있는지 확인합니다 (Continue 버튼 표시용).
 *
 * RU-004-S2: 유효한 세이브만 "있음"으로 판단
 *
 * @returns 유효한 세이브가 있으면 true
 */
export function hasValidSaveGame(): boolean {
  return getValidSaveGameOrNull() !== null;
}

/**
 * 프로필을 선택하고 새 세션을 시작합니다.
 *
 * RU-004-Q4 Step 1: startSessionFromProfile
 * - 모든 store를 초기화
 * - 프로필 기반 SaveGame 생성
 * - store에 초기 상태 주입
 * - localStorage에 저장
 *
 * @param args.profile - 선택한 데모 프로필
 * @param args.t - i18n 번역 함수
 * @returns 세션 시작 결과
 */
export function startSessionFromProfile(args: {
  profile: DemoProfile;
  t: (key: string) => string;
}): SessionStartResult {
  const { profile, t } = args;

  // 현재 언어 설정 유지
  const language = getResolvedLanguage();

  // 프로필에서 SaveGame 생성
  const saveGame = createSaveGameFromProfile(profile, language, t);

  // 모든 세션 store 초기화 (이전 세션 잔재 제거)
  resetAllSessionStores();

  // Store에 초기 상태 주입
  useWorldStore.setState({
    economy: {
      signal: saveGame.economy.signal,
      memory_shard: saveGame.economy.memory_shard,
    },
    turnCount: 0,
    narrativeEntries: saveGame.narrativeHistory,
    quests: saveGame.quests,
    activeRules: saveGame.activeRules,
    mutationTimeline: saveGame.mutationTimeline,
    sceneObjects: saveGame.sceneObjects,
  });

  useInventoryStore.getState().setItems(saveGame.inventory);

  // 프로필 ID 저장 (localStorage)
  saveCurrentProfileId(profile.id);

  // SaveGame 저장 (localStorage)
  saveSaveGame(saveGame);

  return {
    success: true,
    profileId: profile.id,
  };
}

/**
 * 저장된 게임을 복원하여 세션을 계속합니다.
 *
 * RU-004-Q4 Step 1: continueSession
 * RU-004-S1: async로 언어 적용 완료 후 store 주입
 * RU-004-S2: profileId SSOT + 로드 실패 시 null 반환
 *
 * @returns 세션 복원 결과 또는 null (실패 시)
 */
export async function continueSession(): Promise<SessionContinueResult | null> {
  const saveGame = loadSaveGame();
  if (!saveGame) {
    // 로드 실패 시 클린업
    clearSaveGame();
    clearCurrentProfileId();
    console.warn('[SessionLifecycle] SaveGame 로드 실패, 새로 시작 필요');
    return null;
  }

  // RU-004-S1: 언어 설정 비동기 적용 완료 후 진행 (RULE-006)
  await changeLanguage(saveGame.language as SupportedLanguage);

  // 모든 세션 store 초기화 (이전 세션 잔재 제거)
  resetAllSessionStores();

  // Store에 저장된 상태 복원
  useWorldStore.setState({
    economy: {
      signal: saveGame.economy.signal,
      memory_shard: saveGame.economy.memory_shard,
    },
    turnCount: saveGame.turnCount,
    narrativeEntries: saveGame.narrativeHistory,
    quests: saveGame.quests,
    activeRules: saveGame.activeRules,
    mutationTimeline: saveGame.mutationTimeline,
    sceneObjects: saveGame.sceneObjects,
  });

  // 인벤토리 복원
  useInventoryStore.getState().setItems(saveGame.inventory);

  // Economy 복원 (RU-004-S1: hydrateLedger로 순서/timestamp/lastCost/isBalanceLow 정합성 보장)
  useEconomyStore.getState().hydrateLedger(saveGame.economyLedger, saveGame.economy);

  // RU-004-S2: profileId SSOT - SaveGame.profileId를 권위자로 사용
  const profileId = saveGame.profileId;
  if (profileId) {
    saveCurrentProfileId(profileId); // localStorage 동기화 (드리프트 방지)
  }

  return {
    success: true,
    profileId: profileId ?? loadCurrentProfileId() ?? '',
  };
}

/**
 * 현재 프로필의 초기 상태로 리셋합니다.
 *
 * RU-004-Q4 Step 1: resetToCurrentProfile
 *
 * @param args.t - i18n 번역 함수
 * @param args.currentProfileId - 현재 프로필 ID
 * @returns 리셋 성공 여부
 */
export function resetToCurrentProfile(args: {
  t: (key: string) => string;
  currentProfileId: string | null;
}): SessionResetResult {
  const { t, currentProfileId } = args;

  if (!currentProfileId) {
    return { success: false, profileId: null };
  }

  const profile = findProfileById(currentProfileId);
  if (!profile) {
    return { success: false, profileId: null };
  }

  // 동일 프로필로 새 세션 시작
  const result = startSessionFromProfile({ profile, t });

  return {
    success: result.success,
    profileId: result.profileId,
  };
}

/**
 * 세션을 종료하고 프로필 선택 화면으로 돌아갑니다.
 *
 * RU-004-Q4 Step 1: clearSessionAndReturnToSelect
 * - 모든 세션 데이터 클린업 (localStorage + store)
 */
export function clearSessionAndReturnToSelect(): void {
  // localStorage 클린업
  clearSaveGame();
  clearCurrentProfileId();

  // 모든 세션 store 초기화
  resetAllSessionStores();
}

/**
 * 현재 상태를 저장합니다.
 *
 * 턴 완료 시 자동 저장에 사용됩니다.
 *
 * @param profileId - 현재 프로필 ID
 * @returns 저장 성공 여부
 */
export function saveCurrentSession(profileId: string | null): boolean {
  if (!profileId) return false;

  const worldState = useWorldStore.getState();
  const economyState = useEconomyStore.getState();
  const inventoryState = useInventoryStore.getState();

  const saveGame = createSaveGame({
    language: getResolvedLanguage(),
    profileId,
    economy: worldState.economy,
    economyLedger: economyState.ledger,
    turnCount: worldState.turnCount,
    narrativeHistory: worldState.narrativeEntries,
    inventory: inventoryState.items,
    quests: worldState.quests,
    activeRules: worldState.activeRules,
    mutationTimeline: worldState.mutationTimeline,
    sceneObjects: worldState.sceneObjects,
  });

  return saveSaveGame(saveGame);
}

/**
 * 초기 profileId를 결정합니다.
 *
 * RU-004-S2: SaveGame.profileId가 SSOT, CURRENT_PROFILE_KEY는 폴백
 *
 * @returns 초기 profileId 또는 null
 */
export function getInitialProfileId(): string | null {
  // 유효한 SaveGame이 있으면 그 profileId를 사용
  const validSaveGame = getValidSaveGameOrNull();
  if (validSaveGame?.profileId) {
    return validSaveGame.profileId;
  }
  // 폴백: CURRENT_PROFILE_KEY (호환성)
  return loadCurrentProfileId();
}
