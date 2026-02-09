import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeTurnStream } from './turnStream';

describe('U-063: Economy Balance Preservation in executeTurnStream', () => {
  const economySnapshot = { signal: 150, memory_shard: 5 };

  const mockInput = {
    language: 'ko-KR' as const,
    text: 'Hello',
    action_id: null,
    click: null,
    drop: null,
    client: { viewport_w: 100, viewport_h: 100, theme: 'dark' as const },
    economy_snapshot: economySnapshot,
    previous_image_url: null,
    scene_context: null,
  };

  const mockCallbacks = {
    onFinal: vi.fn(),
    onError: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should preserve economy balance when final event has invalid data', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'final',
              data: {
                // narrative 필드 누락 등 스키마 위반
                language: 'ko-KR',
                economy: {
                  cost: { signal: 0, memory_shard: 0 },
                  balance_after: { signal: 0, memory_shard: 0 },
                },
              },
            }) + '\n',
          ),
        );
        controller.close();
      },
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: stream,
    });

    await executeTurnStream(mockInput, mockCallbacks);

    expect(mockCallbacks.onFinal).toHaveBeenCalled();
    const finalEvent = mockCallbacks.onFinal.mock.calls[0][0];
    expect(finalEvent.data.economy.balance_after.signal).toBe(150);
    expect(finalEvent.data.economy.balance_after.memory_shard).toBe(5);
    expect(finalEvent.data.agent_console.badges).toContain('schema_fail');
  });

  it('should preserve economy balance on network error (fetch rejection)', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network failure'),
    );

    await executeTurnStream(mockInput, mockCallbacks);

    expect(mockCallbacks.onError).toHaveBeenCalled();
    expect(mockCallbacks.onFinal).toHaveBeenCalled();

    const finalEvent = mockCallbacks.onFinal.mock.calls[0][0];
    expect(finalEvent.data.economy.balance_after.signal).toBe(150);
    expect(finalEvent.data.economy.balance_after.memory_shard).toBe(5);
    expect(finalEvent.data.narrative).toContain('서버 연결에 실패');
  });
});
