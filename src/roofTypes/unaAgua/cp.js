/**
 * roofTypes/unaAgua/cp.js — Cp cubierta a 1 agua (vertiente única)
 * Nota 4 Fig. 2.4-1: en viento normal, toda la cubierta es BV o SV
 */

import { cpRoofBV, cpRoofSV, CP_ROOF_PAR_05, CP_ROOF_PAR_10 } from '../dosAguas/cp.js';
import { calcCpLW, CP_WW, CP_LAT } from '../../core/pressure.js';

/**
 * Obtiene los Cp para cubierta a 1 agua.
 * @param {number} theta
 * @param {number} hOverL
 * @param {boolean} isNorm
 * @param {number} LB
 * @returns {{ cpWW, cpLW, cpLat, cpRBV, cpRSV, roofMode }}
 */
export function getCp(theta, hOverL, isNorm, LB) {
  const cpWW = CP_WW;
  const cpLW = calcCpLW(LB);
  const cpLat = CP_LAT;

  let cpRBV, cpRSV, roofMode;

  if (isNorm) {
    roofMode = '1agua_normal';
    // Viento hacia lado bajo: toda la cubierta actúa como BV
    cpRBV = cpRoofBV(theta, hOverL);
    // Viento hacia lado alto: toda la cubierta actúa como SV
    cpRSV = cpRoofSV(theta);
  } else {
    roofMode = '1agua_paralelo';
    const tbl = hOverL >= 0.75 ? CP_ROOF_PAR_10 : CP_ROOF_PAR_05;
    cpRBV = { min: tbl[0].mn, max: tbl[0].mx };
    cpRSV = tbl[0].mn;
  }

  return { cpWW, cpLW, cpLat, cpRBV, cpRSV, roofMode };
}
