/**
 * cirsoc101/core/rainLoad.js — Carga de lluvia (Cap. 5 CIRSOC 101-2025)
 * R = 0.0098 × (ds + dh)  [kN/m²]
 */

import { interpDh, calcQ } from '../data/drainageTable.js';

/**
 * Calcula carga de lluvia en modo directo (ds y dh dados).
 * @param {number} ds — profundidad de agua estancada [mm]
 * @param {number} dh — carga hidráulica adicional [mm]
 * @returns {{ R: number, ds: number, dh: number }}
 */
export function calcRainLoad(ds, dh) {
  const d_s = Math.max(0, ds || 0);
  const d_h = Math.max(0, dh || 0);
  const R = 0.0098 * (d_s + d_h);
  return { R, ds: d_s, dh: d_h };
}

/**
 * Calcula carga de lluvia en modo detallado (desde datos de drenaje).
 * Q = 0.278 × 10⁻³ × A × i  [L/s]
 * dh interpolado de Tabla C 5.1 según tipo de desagüe y Q
 *
 * @param {Object} params
 * @param {number} params.ds — profundidad de agua estancada [mm]
 * @param {number} params.area — área de cubierta atendida [m²]
 * @param {number} params.intensidad — intensidad de lluvia [mm/h]
 * @param {string} params.drainType — tipo de desagüe (clave de DRAINAGE_TABLE)
 * @param {number} [params.pendiente] — pendiente de cubierta [%]
 * @returns {{ R: number, ds: number, dh: number, Q: number, ponding: boolean }}
 */
export function calcRainLoadDetailed({ ds, area, intensidad, drainType, pendiente = 0 }) {
  const d_s = Math.max(0, ds || 0);
  const Q = calcQ(area, intensidad);
  const d_h = interpDh(drainType, Q);
  const R = 0.0098 * (d_s + d_h);
  const ponding = pendiente < 3;
  return { R, ds: d_s, dh: Math.round(d_h * 10) / 10, Q: Math.round(Q * 1000) / 1000, ponding };
}
