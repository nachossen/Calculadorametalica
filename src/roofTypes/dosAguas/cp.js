/**
 * roofTypes/dosAguas/cp.js — Cp cubierta a 2 aguas
 * Fig. 2.4-1: normal a cumbrera (3 tablas por h/L) + paralelo a cumbrera
 */

import { interp, lerp } from '../../core/utils.js';
import { calcCpLW, CP_WW, CP_LAT } from '../../core/pressure.js';

/** Cp Cubierta Normal a Cumbrera — BV — según h/L ≤ 0.25 */
const CP_ROOF_N_BV_025 = [
  { t: 10, mn: -0.7,  mx: -0.18 },
  { t: 15, mn: -0.5,  mx:  0    },
  { t: 20, mn: -0.3,  mx:  0.2  },
  { t: 25, mn: -0.2,  mx:  0.3  },
  { t: 30, mn: -0.2,  mx:  0.3  },
  { t: 35, mn:  0,    mx:  0.4  },
  { t: 45, mn:  0,    mx:  0.4  },
];
/** h/L ≤ 0.5 */
const CP_ROOF_N_BV_050 = [
  { t: 10, mn: -0.9,  mx: -0.18 },
  { t: 15, mn: -0.7,  mx: -0.18 },
  { t: 20, mn: -0.4,  mx:  0    },
  { t: 25, mn: -0.3,  mx:  0.2  },
  { t: 30, mn: -0.2,  mx:  0.2  },
  { t: 35, mn: -0.2,  mx:  0.3  },
  { t: 45, mn:  0,    mx:  0.4  },
];
/** h/L ≥ 1.0 */
const CP_ROOF_N_BV_100 = [
  { t: 10, mn: -1.3,  mx: -0.18 },
  { t: 15, mn: -1.0,  mx: -0.18 },
  { t: 20, mn: -0.7,  mx: -0.18 },
  { t: 25, mn: -0.5,  mx:  0    },
  { t: 30, mn: -0.3,  mx:  0.2  },
  { t: 35, mn: -0.2,  mx:  0.2  },
  { t: 45, mn:  0,    mx:  0.3  },
];
/** Cp SV — normal a cumbrera */
const CP_ROOF_N_SV = [
  { t: 10, cp: -0.3 },
  { t: 15, cp: -0.5 },
  { t: 20, cp: -0.6 },
  { t: 90, cp: -0.6 },
];
/** Cp paralelo a cumbrera — h/L ≤ 0.5 */
const CP_ROOF_PAR_05 = [
  { z: '0 a h/2',  mn: -0.9, mx: -0.18 },
  { z: 'h/2 a h',  mn: -0.9, mx: -0.18 },
  { z: 'h a 2h',   mn: -0.5, mx: -0.18 },
  { z: '> 2h',     mn: -0.3, mx: -0.18 },
];
/** Cp paralelo a cumbrera — h/L ≥ 1.0 */
const CP_ROOF_PAR_10 = [
  { z: '0 a h/2',  mn: -1.3, mx: -0.18 },
  { z: 'h/2 a h',  mn: -0.9, mx: -0.18 },
  { z: 'h a 2h',   mn: -0.5, mx: -0.18 },
  { z: '> 2h',     mn: -0.3, mx: -0.18 },
];

// Exportar tablas para uso en TabTablas
export { CP_ROOF_N_BV_025, CP_ROOF_N_BV_050, CP_ROOF_N_BV_100, CP_ROOF_N_SV, CP_ROOF_PAR_05, CP_ROOF_PAR_10 };

/**
 * Cp BV cubierta interpolado (normal a cumbrera) — Fig. 2.4-1.
 * @param {number} theta — ángulo de la cubierta en grados
 * @param {number} hOverL — relación h/L
 * @returns {{ min: number, max: number }}
 */
export function cpRoofBV(theta, hOverL) {
  let tbl = CP_ROOF_N_BV_025;
  if (hOverL > 0.75) tbl = CP_ROOF_N_BV_100;
  else if (hOverL > 0.35) tbl = CP_ROOF_N_BV_050;

  if (theta <= tbl[0].t) return { min: tbl[0].mn, max: tbl[0].mx };
  for (let i = 0; i < tbl.length - 1; i++) {
    if (theta >= tbl[i].t && theta <= tbl[i + 1].t) {
      return {
        min: lerp(theta, tbl[i].t, tbl[i + 1].t, tbl[i].mn, tbl[i + 1].mn),
        max: lerp(theta, tbl[i].t, tbl[i + 1].t, tbl[i].mx, tbl[i + 1].mx),
      };
    }
  }
  const l = tbl[tbl.length - 1];
  return { min: l.mn, max: l.mx };
}

/**
 * Cp SV cubierta (normal a cumbrera) — Fig. 2.4-1.
 * @param {number} theta
 * @returns {number}
 */
export function cpRoofSV(theta) {
  return interp(CP_ROOF_N_SV, 't', 'cp', theta);
}

/**
 * Obtiene los Cp completos para cubierta a 2 aguas.
 * @param {number} theta
 * @param {number} hOverL
 * @param {boolean} isNorm — viento normal (true) o paralelo (false) a cumbrera
 * @param {number} LB — L/B
 * @returns {{ cpWW, cpLW, cpLat, cpRBV, cpRSV, roofMode }}
 */
export function getCp(theta, hOverL, isNorm, LB) {
  const cpWW = CP_WW;
  const cpLW = calcCpLW(LB);
  const cpLat = CP_LAT;

  let cpRBV, cpRSV, roofMode;

  if (isNorm) {
    roofMode = 'normal';
    cpRBV = cpRoofBV(theta, hOverL);
    cpRSV = cpRoofSV(theta);
  } else {
    roofMode = 'paralelo';
    const tbl = hOverL >= 0.75 ? CP_ROOF_PAR_10 : CP_ROOF_PAR_05;
    cpRBV = { min: tbl[0].mn, max: tbl[0].mx };
    cpRSV = tbl[0].mn;
  }

  return { cpWW, cpLW, cpLat, cpRBV, cpRSV, roofMode };
}
