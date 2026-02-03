import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldStore } from './worldStore';

describe('worldStore (U-066: Late-binding Image)', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
  });

  it('setImageLoading이 올바른 상태를 설정해야 한다', () => {
    const turnId = 5;
    useWorldStore.getState().setImageLoading(turnId);

    const state = useWorldStore.getState();
    expect(state.sceneState.imageLoading).toBe(true);
    expect(state.sceneState.pendingImageTurnId).toBe(turnId);
    expect(state.sceneState.sceneRevision).toBe(turnId);
  });

  it('applyLateBindingImage가 일치하는 turnId에 대해 이미지를 적용해야 한다', () => {
    const turnId = 5;
    const imageUrl = 'https://example.com/image.png';

    // 1. 로딩 시작
    useWorldStore.getState().setImageLoading(turnId);

    // 2. 이미지 적용
    const applied = useWorldStore.getState().applyLateBindingImage(imageUrl, turnId);

    expect(applied).toBe(true);
    const state = useWorldStore.getState();
    expect(state.sceneState.status).toBe('scene');
    expect(state.sceneState.imageUrl).toBe(imageUrl);
    expect(state.sceneState.imageLoading).toBe(false);
    expect(state.sceneState.pendingImageTurnId).toBeUndefined();
  });

  it('applyLateBindingImage가 일치하지 않는 turnId에 대해 이미지를 무시해야 한다', () => {
    const oldTurnId = 5;
    const newTurnId = 6;
    const oldImageUrl = 'https://example.com/old.png';

    // 1. 이전 턴 로딩 시작
    useWorldStore.getState().setImageLoading(oldTurnId);

    // 2. 새 턴 시작 (로딩 상태 덮어씀)
    useWorldStore.getState().setImageLoading(newTurnId);

    // 3. 이전 턴의 이미지가 도착함
    const applied = useWorldStore.getState().applyLateBindingImage(oldImageUrl, oldTurnId);

    expect(applied).toBe(false);
    const state = useWorldStore.getState();
    expect(state.sceneState.pendingImageTurnId).toBe(newTurnId); // 여전히 새 턴 대기 중
    expect(state.sceneState.imageUrl).not.toBe(oldImageUrl);
  });

  it('cancelImageLoading이 로딩 상태를 해제하고 이전 이미지를 유지해야 한다', () => {
    const turnId = 5;
    const initialImageUrl = 'https://example.com/initial.png';

    // 초기 이미지 설정
    useWorldStore.setState({
      sceneState: { status: 'scene', imageUrl: initialImageUrl },
    });

    // 로딩 시작
    useWorldStore.getState().setImageLoading(turnId);
    expect(useWorldStore.getState().sceneState.imageLoading).toBe(true);
    expect(useWorldStore.getState().sceneState.previousImageUrl).toBe(initialImageUrl);

    // 로딩 취소
    useWorldStore.getState().cancelImageLoading();

    const state = useWorldStore.getState();
    expect(state.sceneState.imageLoading).toBe(false);
    expect(state.sceneState.imageUrl).toBe(initialImageUrl);
    expect(state.sceneState.previousImageUrl).toBeUndefined();
  });
});
