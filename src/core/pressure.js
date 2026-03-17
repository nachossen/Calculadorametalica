/**
 * core/pressure.js — Presión de diseño
 * Ec. 2.4-1: p = q × G × Cp − qh × (±GCpi)
 */

import { interp } from './utils.js';

/**
 * Coeficiente de presión para la pared sotavento según L/B.
 * Fig. 2.4-1
 * @param {number} LB — relación L/B
 * @returns {number} Cp (negativo, succión)
 */
export const CP_LW_TABLE = [
  { lb: 0, cp: -0.5 },
  { lb: 1, cp: -0.5 },
  { lb: 2, cp: -0.3 },
  { lb: 4, cp: -0.2 },
];

export function calcCpLW(LB) {
  return interp(CP_LW_TABLE, 'lb', 'cp', LB);
}

/** Cp fijo pared barlovento — Fig. 2.4-1 */
export const CP_WW = 0.8;

/** Cp fijo paredes laterales — Fig. 2.4-1 */
export const CP_LAT = -0.7;

/**
 * Presión de diseño para una superficie — Ec. 2.4-1.
 * Retorna {max, min} usando GCpi negativo y positivo respectivamente.
 * @param {number} cp — coeficiente Cp
 * @param {number} q — presión dinámica [Pa]
 * @param {number} qh — presión dinámica en cubierta [Pa]
 * @param {number} G — factor de ráfaga
 * @param {{ p: number, n: number }} gcpi
 * @returns {{ max: number, min: number }} [Pa]
 */
export function calcPressure(cp, q, qh, G, gcpi) {
  return {
    max: q * G * cp - qh * gcpi.n,
    min: q * G * cp - qh * gcpi.p,
  };
}
