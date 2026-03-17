/**
 * core/crGcp.js — Interpolación de GCp para Componentes y Revestimientos
 * Fig. 5.3-1 (paredes) y Fig. 5.3-2 (cubiertas) CIRSOC 102-2025
 */

import { CR_WALL_ZONES } from '../data/crWalls.js';
import { getCrRoofFig } from '../data/crRoofs.js';

/**
 * Interpola GCp (pos y neg) en escala log10 del área tributaria.
 * @param {Array<{a,pos,neg}>} curve — puntos de la curva
 * @param {number} area — área tributaria efectiva [m²]
 * @returns {{ pos: number, neg: number }}
 */
function interpGCp(curve, area) {
  if (area <= curve[0].a) return { pos: curve[0].pos, neg: curve[0].neg };
  const last = curve[curve.length - 1];
  if (area >= last.a) return { pos: last.pos, neg: last.neg };

  const logA = Math.log10(area);
  for (let i = 0; i < curve.length - 1; i++) {
    const log0 = Math.log10(curve[i].a);
    const log1 = Math.log10(curve[i + 1].a);
    if (logA >= log0 && logA <= log1) {
      const t = (logA - log0) / (log1 - log0);
      return {
        pos: curve[i].pos + t * (curve[i + 1].pos - curve[i].pos),
        neg: curve[i].neg + t * (curve[i + 1].neg - curve[i].neg),
      };
    }
  }
  return { pos: last.pos, neg: last.neg };
}

/**
 * Obtiene GCp para una zona de pared.
 * @param {number} zone — 4 o 5
 * @param {number} area — área tributaria [m²]
 * @returns {{ pos: number, neg: number }}
 */
export function getWallGCp(zone, area) {
  const curve = CR_WALL_ZONES[zone];
  if (!curve) return { pos: 0, neg: 0 };
  return interpGCp(curve, area);
}

/**
 * Obtiene GCp para una zona de cubierta.
 * @param {number} zone — 1, 2 o 3
 * @param {number} area — área tributaria [m²]
 * @param {number} thetaDeg — pendiente cubierta [°]
 * @returns {{ pos: number, neg: number }}
 */
export function getRoofGCp(zone, area, thetaDeg) {
  const fig = getCrRoofFig(thetaDeg);
  const curve = fig[zone];
  if (!curve) return { pos: 0, neg: 0 };
  return interpGCp(curve, area);
}

/**
 * Obtiene GCp para todas las zonas de un tipo de elemento.
 * @param {'paredes'|'techos'} elementType
 * @param {number} area — área tributaria [m²]
 * @param {number} thetaDeg — pendiente cubierta [°] (solo techos)
 * @returns {Object} { [zone]: { pos, neg } }
 */
export function getAllGCp(elementType, area, thetaDeg) {
  if (elementType === 'paredes') {
    return {
      4: getWallGCp(4, area),
      5: getWallGCp(5, area),
    };
  }
  return {
    1: getRoofGCp(1, area, thetaDeg),
    2: getRoofGCp(2, area, thetaDeg),
    3: getRoofGCp(3, area, thetaDeg),
  };
}
