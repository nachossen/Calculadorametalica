import { describe, test, expect } from 'vitest';
import { calcG_rigid, selectG } from '../../core/gust.js';
import { calcN1 } from '../../core/frequency.js';

describe('calcN1 — Sec. 1.9.3.1 CIRSOC 102-2025', () => {
  test('Acero h=8.5m → n1 > 1 Hz (rígida)', () => {
    const n1 = calcN1(8.5, 'Acero');
    expect(n1).toBeGreaterThan(1.0);
  });
  test('Acero h=50m → n1 < 1 Hz (flexible)', () => {
    const n1 = calcN1(50, 'Acero');
    expect(n1).toBeLessThan(1.0);
  });
  test('HA h=10m → n1 = 14.93/10^0.9 (Ec.1.9-3)', () => {
    expect(calcN1(10, 'HA')).toBeCloseTo(14.93 / Math.pow(10, 0.9), 2);
  });
  test('Acero h=10m → n1 = 8.58/10^0.8 (Ec.1.9-2)', () => {
    expect(calcN1(10, 'Acero')).toBeCloseTo(8.58 / Math.pow(10, 0.8), 4);
  });
  test('Otra h=10m → n1 = 22.86/10 (Ec.1.9-4)', () => {
    expect(calcN1(10, 'Otra')).toBeCloseTo(2.286, 2);
  });
  test('Muro cortante h=10m Cw=0.5 → n1 = 117.3×√0.5/10 (Ec.1.9-5)', () => {
    expect(calcN1(10, 'Muro cortante', 0.5)).toBeCloseTo(117.3 * Math.sqrt(0.5) / 10, 2);
  });
});

describe('calcG_rigid — Ec. 1.9-2', () => {
  test('Estructura rígida → selectG devuelve 0.85', () => {
    const gRes = calcG_rigid(8.5, 'B', 15, 8.5);
    expect(selectG(true, gRes)).toBe(0.85);
  });
  test('G flexible es menor a 0.92 en Exp.B h=50m', () => {
    const gRes = calcG_rigid(50, 'B', 15, 50);
    expect(gRes.G).toBeLessThan(0.92);
    expect(gRes.G).toBeGreaterThan(0.70);
  });
  test('G Exp.C > G Exp.B para h=10m (zmin B=9.2m clampea z̄, reduce Iz(B))', () => {
    // z̄(B)=max(6,9.2)=9.2m vs z̄(C)=max(6,4.6)=6m → Iz(B) reducido → G(C)>G(B)
    const gB = calcG_rigid(10, 'B', 15, 10).G;
    const gC = calcG_rigid(10, 'C', 15, 10).G;
    expect(gC).toBeGreaterThan(gB);
  });
  test('Iz, Lz, Q son positivos', () => {
    const res = calcG_rigid(10, 'B', 15, 10);
    expect(res.Iz).toBeGreaterThan(0);
    expect(res.Lz).toBeGreaterThan(0);
    expect(res.Q).toBeGreaterThan(0);
  });
});
