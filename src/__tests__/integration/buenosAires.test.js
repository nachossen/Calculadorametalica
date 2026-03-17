/**
 * __tests__/integration/buenosAires.test.js
 *
 * Test de integración: Buenos Aires, Cat.II, Exp.B
 * Edificio: B=15m, L=20m, he=7m, hc=10m (dos aguas)
 *
 * Verifica el pipeline completo runDireccional → runEnvolvente → compareResults
 * contra valores de referencia del monolito v7.
 */

import { describe, it, expect } from 'vitest';
import { runDireccional } from '../../methods/direccional.js';
import { runEnvolvente } from '../../methods/envolvente.js';
import { compareResults } from '../../methods/comparador.js';

const INP_BA = {
  /* Ubicación */
  localidad:    'Buenos Aires',
  V:            45,          // m/s (Cat.II, BA ≈ 45 m/s)
  altitude:     25,          // m s.n.m.

  /* Exposición / estructura */
  exposure:     'B',
  structKey:    'Edificios: SPRFV',
  structSystem: 'Acero',

  /* Geometría */
  roofType:     '2aguas',
  B:            15,
  L:            20,
  he:           7,
  hc:           10,
  porticos:     5,           // sep = L/(porticos-1) = 5 m
  supportType:  'Empotrado',

  /* Topografía */
  topoType:     'Plano',
  H_hill:       0,
  Lh:           100,
  x_dist:       0,
  topoSide:     'Barlovento',

  /* Cerramiento */
  enclosure:    'Cerrado',

  /* Viento */
  windAngle:    0,
};

describe('Buenos Aires — pipeline completo', () => {
  let r;

  it('runDireccional retorna sin error', () => {
    r = runDireccional(INP_BA);
    expect(r).toBeDefined();
    expect(r.error).toBeUndefined();
  });

  it('geometría: theta ≈ 11.31°', () => {
    r = r ?? runDireccional(INP_BA);
    const thetaDeg = r.theta * (180 / Math.PI);
    expect(thetaDeg).toBeCloseTo(11.31, 1);
  });

  it('factor de ráfaga G = 0.85 (edificio rígido)', () => {
    r = r ?? runDireccional(INP_BA);
    expect(r.G).toBeCloseTo(0.85, 3);
  });

  it('Kzt = 1.0 (terreno plano)', () => {
    r = r ?? runDireccional(INP_BA);
    expect(r.Kzt).toBeCloseTo(1.0, 3);
  });

  it('qh en rango físico (0.5 – 2.0 kN/m²)', () => {
    r = r ?? runDireccional(INP_BA);
    expect(r.qh).toBeGreaterThan(0.5);
    expect(r.qh).toBeLessThan(2.0);
  });

  it('V=45 m/s, Exp.B → qh en rango esperado', () => {
    r = r ?? runDireccional(INP_BA);
    // qh = 0.613 × Kz(10m,B) × 1 × Kd × Ke × 45²
    // Kz≈0.70, Kd=0.85, Ke≈1.0 → ~0.88 kN/m²
    expect(r.qh).toBeGreaterThan(0.70);
    expect(r.qh).toBeLessThan(1.20);
  });

  it('pWW.max > 0 (presión en barlovento)', () => {
    r = r ?? runDireccional(INP_BA);
    expect(r.pWW.max).toBeGreaterThan(0);
  });

  it('pLW.max < 0 (succión en sotavento)', () => {
    r = r ?? runDireccional(INP_BA);
    expect(r.pLW.max).toBeLessThan(0);
  });

  it('pRBVmax.min < 0 (succión en cubierta)', () => {
    r = r ?? runDireccional(INP_BA);
    expect(r.pRBVmax.min).toBeLessThan(0);
  });

  it('fuerzas de marco: alguna carga != 0', () => {
    r = r ?? runDireccional(INP_BA);
    const ff = r.frameForces;
    expect(ff).toBeDefined();
    const hasLoad = Object.values(ff).some(v => typeof v === 'number' && Math.abs(v) > 0.001);
    expect(hasLoad).toBe(true);
  });

  it('perfil qzProf tiene al menos 5 puntos', () => {
    r = r ?? runDireccional(INP_BA);
    expect(Array.isArray(r.qzProf)).toBe(true);
    expect(r.qzProf.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Buenos Aires — Método Envolvente', () => {
  const r  = runDireccional(INP_BA);
  const eR = runEnvolvente(INP_BA, r);

  it('Envolvente es aplicable (hc ≤ 20m)', () => {
    expect(eR.isApplicable).toBe(true);
  });

  it('a = max(0.1B, 0.4h, 0.9m) ≈ 4.0m', () => {
    // B=15, h=10 → a = max(1.5, 4.0, 0.9) = 4.0
    expect(eR.a).toBeCloseTo(4.0, 1);
  });

  it('c1 tiene zonas con GCpf definidos', () => {
    expect(eR.c1).toBeDefined();
    expect(Array.isArray(eR.c1.zones)).toBe(true);
    expect(eR.c1.zones.length).toBeGreaterThan(0);
  });

  it('envMax.wallBV > 0', () => {
    expect(eR.envMax.wallBV).toBeGreaterThan(0);
  });
});

describe('Buenos Aires — Comparación', () => {
  const r    = runDireccional(INP_BA);
  const eR   = runEnvolvente(INP_BA, r);
  const cmpR = compareResults(r, eR);

  it('compareResults retorna applicable=true', () => {
    expect(cmpR.applicable).toBe(true);
  });

  it('cheaper es "Envolvente" o "Direccional"', () => {
    expect(['Envolvente', 'Direccional']).toContain(cmpR.cheaper);
  });

  it('savings está entre 0 y 100 (%)', () => {
    const s = parseFloat(cmpR.savings);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(100);
  });
});
