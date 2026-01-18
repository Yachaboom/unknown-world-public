/**
 * Unknown World - 데모용 Fixtures (RU-003-Q5)
 *
 * DEV 환경에서 사용하는 데모 초기 데이터입니다.
 * 언어 중립적인 값(ID/아이콘/수량/좌표)만 포함하며,
 * 표시 문자열(name/label/hint)은 i18n 키를 통해 렌더링합니다.
 *
 * 설계 원칙:
 *   - RULE-006: ko/en 혼합 출력 금지 (i18n 키 기반)
 *   - PRD 6.9: 데모 프로필 경계 확보
 *   - 서버 TurnOutput 대체 시 이 모듈 비활성화 가능
 *
 * @module demo/demoFixtures
 */

import type { Box2D } from '../schemas/turn';

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 데모 인벤토리 아이템 정의 (언어 중립)
 *
 * name은 i18n 키(`demo.items.{id}.name`)로 렌더링합니다.
 */
export interface DemoInventoryItemDef {
  /** 아이템 고유 ID */
  id: string;
  /** 아이템 아이콘 (이모지 또는 URL) */
  icon: string;
  /** 초기 수량 */
  quantity: number;
}

/**
 * 데모 씬 오브젝트 정의 (언어 중립)
 *
 * label/hint는 i18n 키로 렌더링합니다:
 * - labelKey: `demo.scene.{id}.label`
 * - hintKey: `demo.scene.{id}.hint`
 */
export interface DemoSceneObjectDef {
  /** 오브젝트 고유 ID */
  id: string;
  /** 바운딩 박스 (0~1000 정규화) */
  box_2d: Box2D;
  /** i18n 라벨 키 */
  labelKey: string;
  /** i18n 힌트 키 */
  hintKey: string;
}

// =============================================================================
// 데모 인벤토리 아이템
// =============================================================================

/**
 * 데모용 인벤토리 아이템 목록.
 *
 * @remarks
 * - ID/아이콘/수량만 정의 (언어 중립)
 * - 표시 이름은 `demo.items.{id}.name` 키로 i18n 처리
 */
export const DEMO_INVENTORY_ITEMS: readonly DemoInventoryItemDef[] = [
  { id: 'keycard-alpha', icon: '🔑', quantity: 1 },
  { id: 'medkit', icon: '🩹', quantity: 2 },
  { id: 'flashlight', icon: '🔦', quantity: 1 },
  { id: 'data-chip', icon: '💾', quantity: 3 },
] as const;

// =============================================================================
// 데모 씬 오브젝트
// =============================================================================

/**
 * 데모용 씬 오브젝트 목록.
 *
 * @remarks
 * - ID/좌표만 정의 (언어 중립)
 * - 표시 라벨/힌트는 i18n 키로 처리
 */
export const DEMO_SCENE_OBJECTS: readonly DemoSceneObjectDef[] = [
  {
    id: 'demo-terminal',
    box_2d: { ymin: 300, xmin: 100, ymax: 600, xmax: 400 },
    labelKey: 'demo.scene.terminal.label',
    hintKey: 'demo.scene.terminal.hint',
  },
  {
    id: 'demo-door',
    box_2d: { ymin: 200, xmin: 600, ymax: 800, xmax: 900 },
    labelKey: 'demo.scene.door.label',
    hintKey: 'demo.scene.door.hint',
  },
] as const;

// =============================================================================
// 데모 퀘스트 (U-013)
// =============================================================================

/**
 * 데모 퀘스트 정의 (언어 중립)
 *
 * label은 i18n 키(`demo.quest.{id}.label`)로 렌더링합니다.
 */
export interface DemoQuestDef {
  /** 퀘스트 고유 ID */
  id: string;
  /** i18n 라벨 키 */
  labelKey: string;
  /** 완료 여부 */
  is_completed: boolean;
}

/**
 * 데모용 퀘스트 목록.
 */
export const DEMO_QUESTS: readonly DemoQuestDef[] = [
  {
    id: 'demo-quest-terminal',
    labelKey: 'demo.quest.terminal.label',
    is_completed: false,
  },
  {
    id: 'demo-quest-escape',
    labelKey: 'demo.quest.escape.label',
    is_completed: false,
  },
  {
    id: 'demo-quest-collect',
    labelKey: 'demo.quest.collect.label',
    is_completed: true,
  },
] as const;

// =============================================================================
// 데모 규칙 (U-013)
// =============================================================================

/**
 * 데모 규칙 정의 (언어 중립)
 *
 * label/description은 i18n 키로 렌더링합니다.
 */
export interface DemoRuleDef {
  /** 규칙 고유 ID */
  id: string;
  /** i18n 라벨 키 */
  labelKey: string;
  /** i18n 설명 키 (선택) */
  descriptionKey?: string;
}

/**
 * 데모용 규칙 목록.
 */
export const DEMO_RULES: readonly DemoRuleDef[] = [
  {
    id: 'demo-rule-gravity',
    labelKey: 'demo.rule.gravity.label',
    descriptionKey: 'demo.rule.gravity.description',
  },
  {
    id: 'demo-rule-time',
    labelKey: 'demo.rule.time.label',
    descriptionKey: 'demo.rule.time.description',
  },
] as const;

// =============================================================================
// 헬퍼 함수
// =============================================================================

/**
 * 데모 인벤토리 아이템의 i18n 이름 키를 생성합니다.
 *
 * @param itemId - 아이템 ID
 * @returns i18n 키 (예: `demo.items.keycard-alpha.name`)
 */
export function getDemoItemNameKey(itemId: string): string {
  return `demo.items.${itemId}.name`;
}

/**
 * 데모 환경인지 확인합니다 (DEV 가드).
 *
 * @returns DEV 환경 여부
 */
export function isDemoEnvironment(): boolean {
  return import.meta.env.DEV;
}

/**
 * DOM에서 현재 테마를 읽습니다.
 *
 * RU-003-Q5: 'dark' 하드코딩 제거
 * - data-theme 속성을 확인하여 테마 결정
 * - 'crt', 'dark' 또는 미지정 → 'dark'
 * - 'light' → 'light'
 *
 * @returns 현재 테마 ('dark' | 'light')
 */
export function getCurrentThemeFromDOM(): 'dark' | 'light' {
  const dataTheme = document.documentElement.getAttribute('data-theme');

  // 'crt' 테마는 dark 계열로 취급
  if (dataTheme === 'light') {
    return 'light';
  }
  return 'dark';
}
