import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NDJSONParser } from './turnStream';

describe('NDJSONParser', () => {
  let parser: NDJSONParser;

  beforeEach(() => {
    parser = new NDJSONParser();
  });

  it('should parse a single complete line', () => {
    const chunk = JSON.stringify({ type: 'test', value: 1 }) + '\n';
    const results = parser.parse(chunk);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ type: 'test', value: 1 });
  });

  it('should parse multiple complete lines in one chunk', () => {
    const chunk = JSON.stringify({ id: 1 }) + '\n' + JSON.stringify({ id: 2 }) + '\n';
    const results = parser.parse(chunk);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ id: 1 });
    expect(results[1]).toEqual({ id: 2 });
  });

  it('should buffer partial lines and parse them when completed', () => {
    const chunk1 = '{"id": 1';
    const chunk2 = ', "val": "ok"}\n';

    const results1 = parser.parse(chunk1);
    expect(results1).toHaveLength(0);

    const results2 = parser.parse(chunk2);
    expect(results2).toHaveLength(1);
    expect(results2[0]).toEqual({ id: 1, val: 'ok' });
  });

  it('should ignore empty lines', () => {
    const chunk = '\n\n{"a":1}\n\n';
    const results = parser.parse(chunk);
    expect(results).toHaveLength(1);
  });

  it('should not crash on invalid JSON and continue', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chunk = 'invalid json\n{"valid": true}\n';
    const results = parser.parse(chunk);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ valid: true });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should flush remaining buffer', () => {
    parser.parse('{"id": 1}'); // No newline
    const result = parser.flush();
    expect(result).toEqual({ id: 1 });
  });

  it('should return null on flush with empty buffer', () => {
    const result = parser.flush();
    expect(result).toBeNull();
  });
});

describe('executeTurnStream', () => {
  const mockInput = {
    language: 'ko-KR' as const,
    text: 'Hello',
    click: null,
    client: { viewport_w: 100, viewport_h: 100, theme: 'dark' as const },
    economy_snapshot: { signal: 100, memory_shard: 0 },
  };

  const mockCallbacks = {
    onStage: vi.fn(),
    onBadges: vi.fn(),
    onNarrativeDelta: vi.fn(),
    onFinal: vi.fn(),
    onError: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should process stream events correctly', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'stage', name: 'parse', status: 'start' }) + '\n'),
        );
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'narrative_delta', text: 'Hello' }) + '\n'),
        );
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'final',
              data: {
                language: 'ko-KR',
                narrative: 'Hello',
                economy: {
                  cost: { signal: 0, memory_shard: 0 },
                  balance_after: { signal: 100, memory_shard: 0 },
                },
                safety: { blocked: false },
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

    const { executeTurnStream } = await import('./turnStream');
    await executeTurnStream(mockInput, mockCallbacks);

    expect(mockCallbacks.onStage).toHaveBeenCalledWith(expect.objectContaining({ name: 'parse' }));
    expect(mockCallbacks.onNarrativeDelta).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Hello' }),
    );
    expect(mockCallbacks.onFinal).toHaveBeenCalled();
    expect(mockCallbacks.onComplete).toHaveBeenCalled();
  });

  it('should handle HTTP errors', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { executeTurnStream } = await import('./turnStream');
    await executeTurnStream(mockInput, mockCallbacks);

    expect(mockCallbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'STREAM_ERROR',
        message: expect.stringContaining('500'),
      }),
    );
  });

  it('should handle fetch rejection', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network failure'),
    );

    const { executeTurnStream } = await import('./turnStream');
    await executeTurnStream(mockInput, mockCallbacks);

    expect(mockCallbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Network failure',
      }),
    );
  });
});
