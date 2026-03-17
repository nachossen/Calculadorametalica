/**
 * core/gust.js — Factor de ráfaga G
 * Sec. 1.9.3: estructura rígida (n1 ≥ 1 Hz) → G = 0.85
 *             estructura flexible (n1 < 1 Hz) → Ec. 1.9-2
 */

import { T_1_9_1 } from '../data/exposicion.js';

/**
 * Calcula G para estructura rígida o flexible.
 * Ec. 1.9-2: G = 0.925 × (1 + 1.7·gq·Iz·Q) / (1 + 1.7·3.4·Iz)
 * @param {number} h — altura media en m
 * @param {'B'|'C'|'D'} exposure
 * @param {number} B_dim — dimensión perpendicular al viento en m
 * @param {number} _hFull — no usada (alias de h)
 * @returns {{ G:number, Iz:number, Lz:number, Q:number, Q2:number, z_bar:number, gq:number }}
 */
export function calcG_rigid(h, exposure, B_dim, _hFull) {
  const e = T_1_9_1[exposure];
  const z_bar = Math.max(0.6 * h, e.zmin);

  // Ec. 1.9-5: Iz = c × (10/z̄)^(1/6)
  const Iz = e.c * Math.pow(10 / z_bar, 1 / 6);

  // Ec. 1.9-6: Lz = l × (z̄/10)^ε̄
  const Lz = e.l * Math.pow(z_bar / 10, e.eps);

  // Ec. 1.9-4: Q² = 1 / (1 + 0.63×((B+h)/Lz)^0.63)
  const Q2 = 1 / (1 + 0.63 * Math.pow((B_dim + h) / Lz, 0.63));
  const Q = Math.sqrt(Q2);

  const gq = 3.4; // factor pico
  // Ec. 1.9-2: G = 0.925 × (1 + 1.7·gq·Iz·Q) / (1 + 1.7·3.4·Iz)
  const G = 0.925 * (1 + 1.7 * gq * Iz * Q) / (1 + 1.7 * 3.4 * Iz);

  return { G, Iz, Lz, Q, Q2, z_bar, gq };
}

/**
 * Retorna G definitivo según rigidez de la estructura.
 * Sec. 1.9.3: si n1 ≥ 1 Hz → G = 0.85 (rígida)
 * @param {boolean} isRigid
 * @param {ReturnType<typeof calcG_rigid>} gRes
 * @returns {number}
 */
export function selectG(isRigid, gRes) {
  return isRigid ? 0.85 : gRes.G;
}
