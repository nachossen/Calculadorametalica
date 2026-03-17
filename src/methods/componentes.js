/**
 * methods/componentes.js — Método de Componentes y Revestimientos (C&R)
 * Cap. 5 CIRSOC 102-2025
 *
 * Reutiliza qh, Kd, Ke, Kz, Kzt del método direccional.
 */

import { getKd } from '../data/kd.js';
import { calcKz, calcKe, calcQz } from '../core/wind.js';
import { calcKzt } from '../core/topography.js';
import { getGCpi } from '../data/gcpi.js';
import { getAllGCp } from '../core/crGcp.js';
import { calcAllCrPressures } from '../core/crPressure.js';

/**
 * Ejecuta el cálculo de C&R.
 * @param {Object} inp — inputs de la aplicación
 * @param {Object} [dirR] — resultados del método direccional (para reutilizar qh)
 * @returns {Object} resultados C&R
 */
export function runComponentes(inp, dirR) {
  const {
    structKey, exposure: exp, altitude, V,
    he, hc, B, L,
    topoType, H_hill, Lh, x_dist, topoSide,
    enclosure,
    crElementType = 'paredes',
    crTribArea = 10,
  } = inp;

  const h = (he + hc) / 2;
  const thetaDeg = Math.atan2(Math.abs(hc - he), B / 2) * 180 / Math.PI;

  // Dimension a — CIRSOC 102-2025 Sec. 5.3
  const a = Math.max(0.1 * B, 0.4 * h, 0.9);

  // Reutilizar qh del método direccional si disponible
  let qh;
  if (dirR?.qh) {
    qh = dirR.qh;
  } else {
    const Kd = getKd(structKey);
    const Ke = calcKe(altitude);
    const kztResult = calcKzt(topoType, H_hill, Lh, x_dist, h, topoSide, exp);
    const Kz_h = calcKz(h, exp);
    qh = calcQz(Kz_h, kztResult.Kzt, Kd, Ke, V);
  }

  // GCpi
  const gcpi = getGCpi(enclosure);

  // GCp para todas las zonas según tipo de elemento
  const allGCp = getAllGCp(crElementType, crTribArea, thetaDeg);

  // Presiones por zona
  const pressures = calcAllCrPressures(qh, allGCp, gcpi);

  // Zones info para UI
  const zones = crElementType === 'paredes'
    ? { 4: 'Pared general', 5: `Pared borde (a=${a.toFixed(2)}m)` }
    : { 1: 'Cubierta interior', 2: `Cubierta borde (a=${a.toFixed(2)}m)`, 3: `Cubierta esquina (a×a)` };

  return {
    elementType: crElementType,
    tribArea: crTribArea,
    thetaDeg,
    a,
    h,
    he,
    B, L,
    qh,
    gcpi,
    allGCp,
    pressures,
    zones,
    enclosure,
  };
}
