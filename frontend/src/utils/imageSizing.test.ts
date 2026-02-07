import { describe, it, expect } from 'vitest';
import { selectImageSizing, getDefaultImageSizing } from './imageSizing';

describe('imageSizing utils', () => {
  describe('selectImageSizing', () => {
    it('should select 16:9 for landscape aspect ratio', () => {
      const result = selectImageSizing(1920, 1080);
      expect(result.aspectRatio).toBe('16:9');
      expect(result.imageSize).toBe('1K');
    });

    it('should select 1:1 for square aspect ratio', () => {
      const result = selectImageSizing(1000, 1000);
      expect(result.aspectRatio).toBe('1:1');
    });

    it('should select 9:16 for portrait aspect ratio', () => {
      const result = selectImageSizing(1080, 1920);
      expect(result.aspectRatio).toBe('9:16');
    });

    it('should select 21:9 for ultra-wide aspect ratio', () => {
      const result = selectImageSizing(2560, 1080);
      expect(result.aspectRatio).toBe('21:9');
    });

    it('should select 2:3 for vertical aspect ratio', () => {
      const result = selectImageSizing(600, 900);
      expect(result.aspectRatio).toBe('2:3');
    });

    it('should select 4:3 for traditional monitor aspect ratio', () => {
      const result = selectImageSizing(1024, 768);
      expect(result.aspectRatio).toBe('4:3');
    });

    it('should select closest ratio for slightly off dimensions', () => {
      // 800/450 = 1.777... (16:9)
      // 810/450 = 1.8
      const result = selectImageSizing(810, 450);
      expect(result.aspectRatio).toBe('16:9');
    });

    it('should fallback to default for invalid dimensions', () => {
      const defaultSizing = getDefaultImageSizing();

      expect(selectImageSizing(0, 100)).toEqual(defaultSizing);
      expect(selectImageSizing(100, 0)).toEqual(defaultSizing);
      expect(selectImageSizing(40, 40)).toEqual(defaultSizing); // MIN_VALID_DIMENSION is 50
      expect(selectImageSizing(NaN, 100)).toEqual(defaultSizing);
    });

    it('should generate correct label', () => {
      const result = selectImageSizing(1920, 1080);
      expect(result.label).toBe('IMAGE 16:9@1K');
    });
  });

  describe('getDefaultImageSizing', () => {
    it('should return 16:9 and 1K as default', () => {
      const result = getDefaultImageSizing();
      expect(result.aspectRatio).toBe('16:9');
      expect(result.imageSize).toBe('1K');
    });
  });
});
