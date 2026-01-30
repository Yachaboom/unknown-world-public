import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  scanImage,
  validateFile,
  isSupportedImageFile,
  candidateToInventoryItem,
  MAX_FILE_SIZE_BYTES,
  type ItemCandidate,
} from './scanner';

describe('Scanner API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('validateFile', () => {
    it('returns null for valid image files', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      expect(validateFile(file)).toBeNull();
    });

    it('returns error for unsupported MIME types', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      expect(validateFile(file)).toContain('지원하지 않는 파일 형식');
    });

    it('returns error for files exceeding max size', () => {
      const largeFile = {
        size: MAX_FILE_SIZE_BYTES + 1,
        type: 'image/png',
        name: 'large.png',
      } as File;
      expect(validateFile(largeFile)).toContain('파일이 너무 큽니다');
    });
  });

  describe('isSupportedImageFile', () => {
    it('returns true for jpg, png, webp, gif', () => {
      expect(isSupportedImageFile(new File([''], 't.jpg', { type: 'image/jpeg' }))).toBe(true);
      expect(isSupportedImageFile(new File([''], 't.png', { type: 'image/png' }))).toBe(true);
      expect(isSupportedImageFile(new File([''], 't.webp', { type: 'image/webp' }))).toBe(true);
      expect(isSupportedImageFile(new File([''], 't.gif', { type: 'image/gif' }))).toBe(true);
    });

    it('returns false for others', () => {
      expect(isSupportedImageFile(new File([''], 't.pdf', { type: 'application/pdf' }))).toBe(
        false,
      );
    });
  });

  describe('scanImage', () => {
    const mockFile = new File(['mock content'], 'test.png', { type: 'image/png' });
    const mockSuccessResponse = {
      success: true,
      status: 'completed',
      caption: 'A test scan',
      objects: [],
      item_candidates: [{ id: 'item-1', label: 'Test Item', item_type: 'tool' }],
      analysis_time_ms: 100,
      language: 'ko-KR',
    };

    it('returns success data when API call succeeds', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockSuccessResponse,
      });

      const result = await scanImage(mockFile, 'ko-KR');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.caption).toBe('A test scan');
        expect(result.data.item_candidates).toHaveLength(1);
      }
    });

    it('returns error when fetch fails', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await scanImage(mockFile, 'ko-KR');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('서버 오류: 500');
      }
    });

    it('returns error when response schema is invalid', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      });

      const result = await scanImage(mockFile, 'ko-KR');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('데이터 형식이 올바르지 않습니다');
      }
    });

    it('handles network error', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      const result = await scanImage(mockFile, 'ko-KR');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('네트워크 오류');
      }
    });
  });

  describe('candidateToInventoryItem', () => {
    it('correctly maps ItemCandidate to InventoryItem', () => {
      const candidate = {
        id: 'c-1',
        label: 'Rusty Key',
        description: 'An old key',
        item_type: 'key',
      };
      const item = candidateToInventoryItem(candidate);

      expect(item).toEqual({
        id: 'c-1',
        name: 'Rusty Key',
        description: 'An old key',
        icon: '🔑',
        quantity: 1,
      });
    });

    it('uses fallback icon for unknown item types', () => {
      const candidate: ItemCandidate = {
        id: 'c-2',
        label: 'Something',
        description: '',
        item_type: 'unknown',
      };
      const item = candidateToInventoryItem(candidate);
      expect(item.icon).toBe('📦');
    });
  });
});
