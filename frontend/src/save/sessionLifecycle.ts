/**
 * Unknown World - 세션 라이프사이클 관리 모듈 (U-116[Mvp]).
 *
 * U-116: SaveGame 제거 후 단순화된 세션 관리.
 * 새로고침 시 항상 프로필 선택 화면으로 복귀합니다.
 *
 * 설계 원칙:
 *   - RULE-005: Economy 인바리언트 (잔액 음수 금지)
 *   - RULE-006: ko/en i18n 정책 준수 (언어 적용 후 UI 렌더링)
 *   - U-116: SaveGame 없이 store 직접 주입
 *   - U-116-Q1 Option B: 언어 설정만 LocalStorage에 유지
 *   - U-116-Q2 Option A: SaveGame 코드 완전 삭제
 *
 * @module save/sessionLifecycle
 */

import { clearLegacySaveData } from './saveGame';
import { LANGUAGE_STORAGE_KEY } from './constants';
import { findProfileById, type DemoProfile } from '../data/demoProfiles';
import {
  getResolvedLanguage,
  changeLanguage,
  type SupportedLanguage,
  DEFAULT_LANGUAGE,
} from '../i18n';
import { useWorldStore } from '../stores/worldStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useEconomyStore } from '../stores/economyStore';
import { useActionDeckStore } from '../stores/actionDeckStore';
import { useAgentStore } from '../stores/agentStore';
// U-092: 프리셋 아이콘 레지스트리
import { getPresetIconUrl } from '../data/itemIconPresets';

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 부팅 결과 타입.
 * U-116: 항상 profile_select로 시작합니다.
 */
export type SessionBootstrap = { phase: 'profile_select' };

/**
 * 세션 시작 결과 타입.
 */
export interface SessionStartResult {
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
 * U-116: 항상 profile_select로 시작합니다.
 * 기존 LocalStorage의 레거시 SaveGame 데이터를 정리합니다.
 *
 * @returns SessionBootstrap - 항상 { phase: 'profile_select' }
 */
export function bootstrapSession(): SessionBootstrap {
  // U-116: 기존 SaveGame 레거시 데이터 정리 (1회)
  clearLegacySaveData();

  return { phase: 'profile_select' };
}

/**
 * 프로필을 선택하고 새 세션을 시작합니다.
 *
 * U-116: SaveGame 없이 프로필 데이터를 store에 직접 적용합니다.
 *
 * @param args.profile - 선택한 데모 프로필
 * @param args.t - i18n 번역 함수
 * @param args.language - 세션 언어 (명시적 전달로 SSOT 유지)
 * @returns 세션 시작 결과
 */
export function startSessionFromProfile(args: {
  profile: DemoProfile;
  t: (key: string) => string;
  language?: SupportedLanguage;
}): SessionStartResult {
  const { profile, t, language: explicitLanguage } = args;

  // U-044: 명시적 언어가 있으면 사용, 없으면 i18n 현재 값 사용
  const language = explicitLanguage ?? getResolvedLanguage();

  // 모든 세션 store 초기화 (이전 세션 잔재 제거)
  resetAllSessionStores();

  // U-116: 프로필 데이터를 store에 직접 적용 (SaveGame 중간 단계 제거)
  const now = Date.now();

  useWorldStore.setState({
    economy: {
      signal: profile.initialState.economy.signal,
      memory_shard: profile.initialState.economy.memory_shard,
      credit: profile.initialState.economy.credit,
    },
    turnCount: 0,
    narrativeEntries: [
      {
        turn: 0,
        text: t(profile.initialState.welcomeMessageKey),
        type: 'narrative' as const,
      },
    ],
    // U-078: 목표 시스템 강화
    quests: profile.initialState.questDefs.map((quest) => ({
      id: quest.id,
      label: t(quest.labelKey),
      is_completed: quest.is_completed,
      description: quest.descriptionKey ? t(quest.descriptionKey) : null,
      is_main: quest.is_main ?? false,
      progress: quest.progress ?? 0,
      reward_signal: quest.reward_signal ?? 0,
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
    // U-116: sceneObjectDefs에서 변환 (5단계에서 빈 배열로 변경됨)
    sceneObjects: profile.initialState.sceneObjectDefs.map((obj) => ({
      id: obj.id,
      label: t(obj.labelKey),
      box_2d: obj.box_2d,
      interaction_hint: t(obj.hintKey),
    })),
  });

  // U-092: 프리셋 아이콘이 있으면 즉시 적용
  useInventoryStore.getState().setItems(
    profile.initialState.inventoryDefs.map((item) => ({
      id: item.id,
      name: t(item.nameKey),
      icon: getPresetIconUrl(item.id) ?? item.icon,
      quantity: item.quantity,
    })),
  );

  // 언어 설정 저장 (Q1 Option B: 언어만 유지)
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // 시크릿 모드 등에서 실패 가능 - 무시
  }

  return {
    success: true,
    profileId: profile.id,
  };
}

/**
 * 현재 프로필의 초기 상태로 리셋합니다.
 *
 * U-116: 동일 프로필로 새 세션을 시작합니다.
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
 * U-116: 모든 세션 store를 초기화합니다 (LocalStorage 조작 없음).
 */
export function clearSessionAndReturnToSelect(): void {
  // 모든 세션 store 초기화
  resetAllSessionStores();
}

// =============================================================================
// U-044 + U-116: 세션 언어 SSOT API
// =============================================================================

/**
 * 현재 세션 언어를 반환합니다 (SSOT).
 *
 * U-116: SaveGame 없이 i18n의 현재 언어를 직접 사용합니다.
 *
 * @returns 현재 세션 언어 (ko-KR | en-US)
 */
export function getSessionLanguage(): SupportedLanguage {
  return getResolvedLanguage();
}

/**
 * 세션 언어를 변경합니다.
 *
 * U-044: 언어 변경은 세션 경계에서만 허용 (토글=리셋 정책).
 * U-116-Q1 Option B: 언어 설정을 LocalStorage에 유지합니다.
 *
 * @param language - 변경할 언어
 */
export async function setSessionLanguage(language: SupportedLanguage): Promise<void> {
  await changeLanguage(language);
  // Q1 Option B: 언어 설정만 LocalStorage에 유지
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // 시크릿 모드 등에서 실패 가능 - 무시
  }
}

/**
 * 초기 세션 언어를 결정합니다.
 *
 * U-116-Q1 Option B: LocalStorage에서 이전 언어 설정을 읽습니다.
 * 없으면 DEFAULT_LANGUAGE를 반환합니다.
 *
 * @returns 초기 세션 언어
 */
export function getInitialSessionLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'ko-KR' || stored === 'en-US') {
      return stored;
    }
  } catch {
    // localStorage 접근 불가 환경 - 무시
  }
  return DEFAULT_LANGUAGE;
}
