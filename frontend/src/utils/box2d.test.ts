import { describe, it, expect } from 'vitest';
import {
  box2dToPixel,
  pixelToBox2d,
  isValidBox2D,
  box2dArea,
  box2dCenter,
  NORMALIZED_MAX,
} from './box2d';
import type { Box2D } from '../schemas/turn';

describe('box2d utils', () => {
  const canvas = { width: 800, height: 600 };

  describe('box2dToPixel', () => {
    it('should correctly convert normalized coordinates to pixels', () => {
      const normalized: Box2D = { ymin: 100, xmin: 200, ymax: 500, xmax: 800 };
      const pixel = box2dToPixel(normalized, canvas);

      // top = 100 * (600 / 1000) = 60
      // left = 200 * (800 / 1000) = 160
      // bottom = 500 * (600 / 1000) = 300
      // right = 800 * (800 / 1000) = 640
      // width = 640 - 160 = 480
      // height = 300 - 60 = 240

      expect(pixel).toEqual({
        top: 60,
        left: 160,
        width: 480,
        height: 240,
      });
    });

    it('should handle full canvas size', () => {
      const normalized: Box2D = { ymin: 0, xmin: 0, ymax: 1000, xmax: 1000 };
      const pixel = box2dToPixel(normalized, canvas);

      expect(pixel).toEqual({
        top: 0,
        left: 0,
        width: 800,
        height: 600,
      });
    });
  });

  describe('pixelToBox2d', () => {
    it('should correctly convert pixels back to normalized coordinates', () => {
      const pixel = { top: 60, left: 160, width: 480, height: 240 };
      const normalized = pixelToBox2d(pixel, canvas);

      expect(normalized).toEqual({
        ymin: 100,
        xmin: 200,
        ymax: 500,
        xmax: 800,
      });
    });

    it('should round and clamp values', () => {
      const pixel = { top: -10, left: -20, width: 900, height: 700 };
      const normalized = pixelToBox2d(pixel, canvas);

      expect(normalized.ymin).toBe(0);
      expect(normalized.xmin).toBe(0);
      expect(normalized.ymax).toBe(NORMALIZED_MAX);
      expect(normalized.xmax).toBe(NORMALIZED_MAX);
    });
  });

  describe('isValidBox2D', () => {
    it('should return true for valid boxes', () => {
      expect(isValidBox2D({ ymin: 100, xmin: 100, ymax: 200, xmax: 200 })).toBe(true);
      expect(isValidBox2D({ ymin: 0, xmin: 0, ymax: 1000, xmax: 1000 })).toBe(true);
    });

    it('should return false for out of range values', () => {
      expect(isValidBox2D({ ymin: -1, xmin: 0, ymax: 100, xmax: 100 })).toBe(false);
      expect(isValidBox2D({ ymin: 0, xmin: 0, ymax: 1001, xmax: 100 })).toBe(false);
    });

    it('should return false for invalid order', () => {
      expect(isValidBox2D({ ymin: 500, xmin: 100, ymax: 400, xmax: 200 })).toBe(false);
      expect(isValidBox2D({ ymin: 100, xmin: 500, ymax: 200, xmax: 400 })).toBe(false);
    });
  });

  describe('box2dArea', () => {
    it('should calculate area correctly', () => {
      const box = { ymin: 100, xmin: 100, ymax: 200, xmax: 300 };
      expect(box2dArea(box)).toBe(20000); // (200-100) * (300-100) = 100 * 200
    });
  });

  describe('box2dCenter', () => {
    it('should calculate center correctly', () => {
      const box = { ymin: 100, xmin: 100, ymax: 300, xmax: 500 };
      expect(box2dCenter(box)).toEqual({ x: 300, y: 200 });
    });
  });
});
