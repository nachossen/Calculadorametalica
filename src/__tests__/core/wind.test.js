import { describe, test, expect } from 'vitest';
import { calcKz, calcKe, calcQz } from '../../core/wind.js';

describe('calcKz — Tabla 1.13-1', () => {
  test('Kz en z=10m Exp.B = 0.71', () => {
    expect(calcKz(10, 'B')).toBeCloseTo(0.71, 2);
  });
  test('Kz en z=10m Exp.C = 1.00', () => {
    expect(calcKz(10, 'C')).toBeCloseTo(1.00, 2);
  });
  test('Kz en z=10m Exp.D = 1.19', () => {
    expect(calcKz(10, 'D')).toBeCloseTo(1.19, 2);
  });
  test('Kz en z=0m (mínimo) Exp.B = 0.59', () => {
    expect(calcKz(0, 'B')).toBeCloseTo(0.59, 2);
  });
  test('Kz en z=5m Exp.B = 0.59 (igual que z=0)', () => {
    expect(calcKz(5, 'B')).toBeCloseTo(0.59, 2);
  });
  test('Kz en z=20m Exp.B = 0.85', () => {
    expect(calcKz(20, 'B')).toBeCloseTo(0.85, 2);
  });
  test('Kz interpolado z=8.5m Exp.B entre 0.59 y 0.71', () => {
    const kz = calcKz(8.5, 'B');
    expect(kz).toBeGreaterThan(0.59);
    expect(kz).toBeLessThan(0.71);
  });
});

describe('calcKe — Tabla 1.12-1', () => {
  test('Ke en altitud=0 = 1.00', () => {
    expect(calcKe(0)).toBe(1.0);
  });
  test('Ke en altitud=300m = 0.96', () => {
    expect(calcKe(300)).toBeCloseTo(0.96, 2);
  });
  test('Ke en altitud=600m = 0.93', () => {
    expect(calcKe(600)).toBeCloseTo(0.93, 2);
  });
  test('Ke interpolado altitud=150m entre 1.00 y 0.96', () => {
    const ke = calcKe(150);
    expect(ke).toBeGreaterThan(0.96);
    expect(ke).toBeLessThanOrEqual(1.00);
  });
});

describe('calcQz — Ec. 1.13-1', () => {
  test('qh Buenos Aires Cat.II Exp.B h≈8.5m', () => {
    // V=55.1, Kz=0.66 (interpolado z=8.5m), Kzt=1, Kd=0.85, Ke=1
    const Kz = calcKz(8.5, 'B'); // ~0.66
    const qh = calcQz(Kz, 1.0, 0.85, 1.0, 55.1);
    expect(qh).toBeGreaterThan(900);
    expect(qh).toBeLessThan(1200);
  });
  test('Fórmula directa: Kz=1 Kzt=1 Kd=1 Ke=1 V=1 → 0.613', () => {
    expect(calcQz(1, 1, 1, 1, 1)).toBeCloseTo(0.613, 3);
  });
  test('qh Buenos Aires Cat.II Exp.B h=8.5m case conocido del monolito', () => {
    // Monolito: V=55.1, Exp B, Kz interpolado h=8.5m
    const Kz = calcKz(8.5, 'B');
    const qh = calcQz(Kz, 1.0, 0.85, 1.0, 55.1);
    // Del monolito con esos parámetros se obtienen ~1000-1100 Pa
    expect(qh).toBeGreaterThan(950);
    expect(qh).toBeLessThan(1150);
  });
  test('qh con h=10m Exp.B V=55.1 Kz=0.71', () => {
    const qh = calcQz(0.71, 1.0, 0.85, 1.0, 55.1);
    // 0.613 * 0.71 * 1 * 0.85 * 1 * 55.1^2 = 0.613 * 0.71 * 0.85 * 3036.01
    expect(qh).toBeCloseTo(0.613 * 0.71 * 0.85 * 1.0 * 55.1 * 55.1, 0);
  });
});
