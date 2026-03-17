/**
 * core/topography.js — Factor Topográfico Kzt
 * Fig. 1.8-1: Kzt = (1 + K1·K2·K3)²
 * Nota 2: Si H/Lh > 0.5 → usar H/Lh=0.5 y sustituir Lh por 2H
 */

import { TOPO_K1_TABLE, TOPO_K2_TABLE, TOPO_K3_TABLE } from '../data/topografia.js';
import { interp } from './utils.js';

/**
 * Calcula Kzt completo con sus factores intermedios.
 * @param {string} topoType — 'Plano' | 'Loma 2D' | 'Escarpe 2D' | 'Colina 3D'
 * @param {number} H_hill — altura de elevación en m
 * @param {number} Lh — semilongitud horizontal en m
 * @param {number} x_dist — distancia horizontal a la cresta en m (signo indica lado)
 * @param {number} z_eval — altura de evaluación en m
 * @param {string} side — 'Barlovento' | 'Sotavento' (solo para Escarpe 2D)
 * @param {'B'|'C'|'D'} _exposure — no usada actualmente (tabla unificada)
 * @returns {{ Kzt:number, K1:number, K2:number, K3:number, HLh:number, xLh:number, zLh:number }}
 */
export function calcKzt(topoType, H_hill, Lh, x_dist, z_eval, side, _exposure) {
  if (topoType === 'Plano' || !H_hill || !Lh) {
    return { Kzt: 1, K1: 0, K2: 0, K3: 0, HLh: 0, xLh: 0, zLh: 0 };
  }

  // Nota 2: capear H/Lh a 0.5; si supera, Lh_eff = 2H
  let HLh = H_hill / Lh;
  let Lh_eff = Lh;
  if (HLh > 0.5) { HLh = 0.5; Lh_eff = 2 * H_hill; }

  const k1Key = topoType === 'Loma 2D' ? 'loma' : topoType === 'Escarpe 2D' ? 'escarpa' : 'colina';
  const K1 = interp(TOPO_K1_TABLE, 'hl', k1Key, HLh);

  const xLh = Math.abs(x_dist) / Lh_eff;
  const k2Key = topoType === 'Escarpe 2D' ? 'escarpa' : 'otros';
  const K2 = interp(TOPO_K2_TABLE, 'xl', k2Key, xLh);

  const zLh = z_eval / Lh_eff;
  const K3 = interp(TOPO_K3_TABLE, 'zl', k1Key, zLh);

  const Kzt = Math.pow(1 + K1 * K2 * K3, 2);
  return { Kzt, K1, K2, K3, HLh, xLh, zLh };
}
