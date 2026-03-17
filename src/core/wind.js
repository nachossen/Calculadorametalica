/**
 * core/wind.js — Presión dinámica del viento
 * Ec. 1.13-1: qz = 0.613 × Kz × Kzt × Kd × Ke × V²
 */

import { T_1_13_1 } from '../data/kz-tabla.js';
import { T_1_12_1 } from '../data/ke.js';
import { interp } from './utils.js';

/**
 * Kz interpolado de Tabla 1.13-1.
 * @param {number} z — altura en metros
 * @param {'B'|'C'|'D'} exposure
 * @returns {number} Kz
 */
export function calcKz(z, exposure) {
  return interp(T_1_13_1, 'z', exposure, Math.max(z, 0));
}

/**
 * Ke interpolado de Tabla 1.12-1.
 * @param {number} altitude — altitud en m.s.n.m.
 * @returns {number} Ke
 */
export function calcKe(altitude) {
  if (altitude <= 0) return 1.0;
  return interp(T_1_12_1, 'alt', 'ke', altitude);
}

/**
 * Presión dinámica de velocidad — Ec. 1.13-1.
 * qz = 0.613 × Kz × Kzt × Kd × Ke × V²
 * @param {number} Kz
 * @param {number} Kzt
 * @param {number} Kd
 * @param {number} Ke
 * @param {number} V — velocidad básica en m/s
 * @returns {number} qz en Pa
 */
export function calcQz(Kz, Kzt, Kd, Ke, V) {
  return 0.613 * Kz * Kzt * Kd * Ke * V * V;
}

/**
 * Genera el perfil qz(z) para una lista de alturas.
 * @param {Object} params
 * @param {number} params.hc — altura cumbrera
 * @param {'B'|'C'|'D'} params.exposure
 * @param {number} params.Kzt
 * @param {number} params.Kd
 * @param {number} params.Ke
 * @param {number} params.V
 * @returns {Array<{z:number, Kz:number, qz:number}>}
 */
export function buildQzProfile({ hc, exposure, Kzt, Kd, Ke, V }) {
  const heights = [];
  const maxZ = Math.max(hc + 5, 25);
  for (let z = 0; z <= maxZ; z += z < 10 ? 1 : 5) heights.push(z);
  const hRound = Math.round(hc * 2) / 2;
  if (!heights.includes(hRound)) heights.push(hRound);
  heights.sort((a, b) => a - b);
  return heights.map(z => ({
    z,
    Kz: calcKz(z, exposure),
    qz: calcQz(calcKz(z, exposure), Kzt, Kd, Ke, V),
  }));
}
