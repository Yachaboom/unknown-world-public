/**
 * Unknown World - Legacy SaveGame 정리 모듈 (U-116[Mvp]).
 *
 * SaveGame 시스템은 U-116에서 완전 제거되었습니다.
 * 이 모듈은 기존 사용자의 LocalStorage에 남아있는 레거시 데이터를
 * 정리하는 유틸리티만 제공합니다.
 *
 * MMP에서 세션 영속성을 재설계할 때(U-113) 이 파일은 새로운 역할을 가질 수 있습니다.
 *
 * @module save/saveGame
 */

import { LEGACY_SAVEGAME_STORAGE_KEY, LEGACY_PROFILE_STORAGE_KEY } from './constants';

// =============================================================================
// Legacy 데이터 정리
// =============================================================================

/**
 * 기존 SaveGame 레거시 데이터를 LocalStorage에서 정리합니다.
 *
 * U-116: 부팅 시 1회 호출하여 이전 버전의 SaveGame 잔재를 제거합니다.
 * - `unknown_world_savegame` 키 제거
 * - `unknown_world_current_profile` 키 제거
 *
 * 언어 설정(`unknown_world_language`)은 유지합니다 (Q1 Option B).
 */
export function clearLegacySaveData(): void {
  try {
    localStorage.removeItem(LEGACY_SAVEGAME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
  } catch (error) {
    console.error('[SaveGame] 레거시 데이터 정리 실패:', error);
  }
}
