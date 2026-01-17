import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInventoryStore } from '../stores/inventoryStore';
import { useWorldStore } from '../stores/worldStore';
import {
  DEMO_INVENTORY_ITEMS,
  DEMO_SCENE_OBJECTS,
  getDemoItemNameKey,
  isDemoEnvironment,
} from '../demo/demoFixtures';

/**
 * 데모 환경에서 초기 mock 데이터를 로드하는 훅 (RU-003-Q5).
 */
export function useDemoInitializer() {
  const { t } = useTranslation();
  const { items: inventoryItems, addItems: addInventoryItems } = useInventoryStore();
  const { sceneObjects, setSceneObjects, narrativeEntries, initialize: initializeWorld } = useWorldStore();

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
}
