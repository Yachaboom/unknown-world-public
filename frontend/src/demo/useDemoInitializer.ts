import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInventoryStore } from '../stores/inventoryStore';
import { useWorldStore } from '../stores/worldStore';
import type { Quest, WorldRule } from '../schemas/turn';
import type { MutationEvent } from '../stores/worldStore';
import {
  DEMO_INVENTORY_ITEMS,
  DEMO_SCENE_OBJECTS,
  DEMO_QUESTS,
  DEMO_RULES,
  getDemoItemNameKey,
  isDemoEnvironment,
} from '../demo/demoFixtures';

/**
 * 데모 환경에서 초기 mock 데이터를 로드하는 훅 (RU-003-Q5, U-013).
 */
export function useDemoInitializer() {
  const { t } = useTranslation();
  const { items: inventoryItems, addItems: addInventoryItems } = useInventoryStore();
  const worldStore = useWorldStore();
  const {
    sceneObjects,
    setSceneObjects,
    narrativeEntries,
    initialize: initializeWorld,
    quests,
    activeRules,
  } = worldStore;

  useEffect(() => {
    // 월드 초기화 (환영 메시지)
    if (narrativeEntries.length === 0) {
      initializeWorld(t('narrative.welcome'));
    }

    // DEV: 데모용 mock 데이터 초기화 (RU-003-Q5: DEV 가드 + i18n 키 기반)
    if (isDemoEnvironment()) {
      // 데모용 mock 인벤토리 초기화 (U-011)
      if (inventoryItems.length === 0) {
        const demoInventory = DEMO_INVENTORY_ITEMS.map((item) => ({
          id: item.id,
          name: t(getDemoItemNameKey(item.id)),
          icon: item.icon,
          quantity: item.quantity,
        }));
        addInventoryItems(demoInventory);
      }

      // 데모용 mock Scene Objects 초기화 (U-010)
      if (sceneObjects.length === 0) {
        const demoSceneObjects = DEMO_SCENE_OBJECTS.map((obj) => ({
          id: obj.id,
          label: t(obj.labelKey),
          box_2d: obj.box_2d,
          interaction_hint: t(obj.hintKey),
        }));
        setSceneObjects(demoSceneObjects);
      }

      // 데모용 mock 퀘스트 초기화 (U-013)
      if (quests.length === 0) {
        const demoQuests: Quest[] = DEMO_QUESTS.map((q) => ({
          id: q.id,
          label: t(q.labelKey),
          is_completed: q.is_completed,
        }));
        useWorldStore.setState({ quests: demoQuests });
      }

      // 데모용 mock 규칙 초기화 (U-013)
      if (activeRules.length === 0) {
        const demoRules: WorldRule[] = DEMO_RULES.map((r) => ({
          id: r.id,
          label: t(r.labelKey),
          description: r.descriptionKey ? t(r.descriptionKey) : null,
        }));
        // 데모 뮤테이션 타임라인 생성 (규칙 추가 이벤트)
        const now = Date.now();
        const demoMutations: MutationEvent[] = DEMO_RULES.map((r, index) => ({
          turn: 0,
          ruleId: r.id,
          type: 'added' as const,
          label: t(r.labelKey),
          description: r.descriptionKey ? t(r.descriptionKey) : undefined,
          timestamp: now - index * 1000, // 시간 순서 구분용
        }));
        useWorldStore.setState({
          activeRules: demoRules,
          mutationTimeline: demoMutations,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
}
