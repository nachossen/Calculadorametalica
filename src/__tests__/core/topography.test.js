import { describe, test, expect } from 'vitest';
import { calcKzt } from '../../core/topography.js';

describe('calcKzt — Fig. 1.8-1', () => {
  test('Terreno plano → Kzt = 1.00', () => {
    const res = calcKzt('Plano', 0, 100, 0, 10, 'Barlovento', 'B');
    expect(res.Kzt).toBe(1);
    expect(res.K1).toBe(0);
  });

  test('Colina 3D H=20 Lh=100 x=0 z=10 → Kzt > 1', () => {
    const res = calcKzt('Colina 3D', 20, 100, 0, 10, 'Barlovento', 'B');
    expect(res.Kzt).toBeGreaterThan(1.0);
  });

  test('Nota 2: H/Lh > 0.5 → usa H/Lh=0.5 (HLh capeado)', () => {
    const res = calcKzt('Loma 2D', 100, 100, 0, 10, 'Barlovento', 'C');
    // H/Lh = 1.0 > 0.5, debe capar a 0.5
    expect(res.HLh).toBeCloseTo(0.5, 3);
  });

  test('Lejos de la cresta (x grande) → K2 ≈ 0 → Kzt ≈ 1', () => {
    const res = calcKzt('Colina 3D', 20, 100, 600, 10, 'Barlovento', 'B');
    // x/Lh = 6 > 2 → K2 = 0
    expect(res.K2).toBeCloseTo(0, 3);
    expect(res.Kzt).toBeCloseTo(1.0, 3);
  });

  test('Altura muy grande → K3 ≈ 0 → Kzt ≈ 1', () => {
    const res = calcKzt('Loma 2D', 20, 100, 0, 250, 'Barlovento', 'B');
    // z/Lh = 2.5 > 2 → K3 = 0
    expect(res.K3).toBeCloseTo(0, 3);
    expect(res.Kzt).toBeCloseTo(1.0, 3);
  });
});
