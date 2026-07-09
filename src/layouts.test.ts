import { describe, it, expect } from 'vitest';
import { layoutSlots, radiusFor, PANEL_H, type LayoutMode } from './layouts';

const MODES: LayoutMode[] = ['ring', 'helix', 'sphere'];

describe('radiusFor', () => {
  it('starts at the bare offset for an empty ring', () => {
    expect(radiusFor(0)).toBe(0.6);
  });

  it('follows the circumference formula', () => {
    // (PANEL_W * PANEL_PITCH * count) / (2π) + 0.6, with PANEL_W=2.4, PITCH=1.4.
    expect(radiusFor(10)).toBeCloseTo(5.9476, 3);
  });

  it('grows monotonically with the panel count', () => {
    for (let n = 1; n < 40; n++) {
      expect(radiusFor(n + 1)).toBeGreaterThan(radiusFor(n));
    }
  });
});

describe('layoutSlots', () => {
  it('returns exactly one slot per panel in every mode', () => {
    for (const mode of MODES) {
      for (const n of [1, 5, 12, 30]) {
        expect(layoutSlots(mode, n, 6, PANEL_H)).toHaveLength(n);
      }
    }
  });

  it('never produces a NaN or Infinity coordinate (incl. the n=1 edge case)', () => {
    for (const mode of MODES) {
      for (let n = 1; n <= 30; n++) {
        for (const s of layoutSlots(mode, n, radiusFor(n), PANEL_H)) {
          for (const v of [s.x, s.y, s.z, s.rotX, s.rotY]) {
            expect(Number.isFinite(v)).toBe(true);
          }
        }
      }
    }
  });

  describe('ring', () => {
    it('places every panel on the ring radius at y=0 (rotation-symmetric)', () => {
      const r = 6;
      for (const s of layoutSlots('ring', 12, r, PANEL_H)) {
        expect(Math.hypot(s.x, s.z)).toBeCloseTo(r, 6);
        expect(s.y).toBe(0);
        expect(s.rotX).toBe(0);
      }
    });

    it('spaces the panels evenly around the full circle', () => {
      const slots = layoutSlots('ring', 8, 6, PANEL_H);
      expect(slots[0].rotY).toBeCloseTo(0, 6);
      expect(slots[2].rotY).toBeCloseTo(Math.PI / 2, 6);
      expect(slots[4].rotY).toBeCloseTo(Math.PI, 6);
    });
  });

  describe('helix', () => {
    it('keeps every panel on the (slightly inset) ring radius', () => {
      const r = 6;
      for (const s of layoutSlots('helix', 9, r, PANEL_H)) {
        expect(Math.hypot(s.x, s.z)).toBeCloseTo(r * 0.92, 6);
      }
    });

    it('centers a single panel at mid-height, not at a division by zero', () => {
      const [only] = layoutSlots('helix', 1, 6, PANEL_H);
      expect(only.y).toBeCloseTo(0, 6);
    });

    it('stays inside a symmetric vertical band', () => {
      const slots = layoutSlots('helix', 20, 6, PANEL_H);
      const ys = slots.map((s) => s.y);
      // Top and bottom mirror around 0 (t runs 0..1, y = (0.5 - t) * height).
      expect(Math.max(...ys)).toBeCloseTo(-Math.min(...ys), 6);
    });
  });

  describe('sphere', () => {
    it('places every panel on the sphere surface of radius √n · 1.4', () => {
      const n = 24;
      const R = Math.sqrt(n) * 1.4;
      for (const s of layoutSlots('sphere', n, 6, PANEL_H)) {
        expect(Math.hypot(s.x, s.y, s.z)).toBeCloseTo(R, 6);
      }
    });
  });
});
