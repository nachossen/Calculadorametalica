/**
 * roofTypes/unaAgua/frameForces.js — Cargas en pórtico y reacciones (1 agua)
 */

/**
 * Calcula cargas distribuidas [kN/m] y reacciones en base.
 * @param {Object} pressures
 * @param {Object} geo
 * @param {number} sep
 * @param {string} supportType
 * @returns {Object}
 */
export function calcFrameForces(pressures, geo, sep, supportType) {
  const { pWW, pLW, pRBVmax, pRBVmin } = pressures;
  const { theta, he, B } = geo;
  const isEmp = supportType === 'Empotrado';

  const cosT = Math.cos(theta * Math.PI / 180);
  const thetaRad = theta * Math.PI / 180;

  // Para 1 agua: faldón completo de largo B/cos(θ)
  const slopeLen = B / Math.cos(thetaRad);

  const w_ww_max  =  pWW.max     * sep / 1000;
  const w_ww_min  =  pWW.min     * sep / 1000;
  const w_lw_max  =  pLW.max     * sep / 1000;
  const w_lw_min  =  pLW.min     * sep / 1000;
  const w_rbv_max =  pRBVmax.max * sep / 1000;
  const w_rbv_min =  pRBVmin.min * sep / 1000;
  // 1 agua no tiene faldón SV
  const w_rsv_max = 0;
  const w_rsv_min = 0;

  const H_walls = (pWW.max + pLW.max) * he * sep / 1000;
  const V_roof  = w_rbv_min * cosT * slopeLen;

  // Momentos en base: Empotrado → w·h²/12 (biempotrada); Articulado → 0
  const M_bv = isEmp ? w_ww_max * he * he / 12 : 0;
  const M_sv = isEmp ? w_lw_min * he * he / 12 : 0;

  return {
    sep, slopeLen, is1agua: true, isEmp,
    w_ww_max, w_ww_min, w_lw_max, w_lw_min,
    w_rbv_max, w_rbv_min, w_rsv_max, w_rsv_min,
    H_walls, V_roof, M_bv, M_sv,
    Rx_bv: H_walls / 2, Rx_sv: H_walls / 2,
    Ry_bv: V_roof / 2,  Ry_sv: V_roof / 2,
  };
}
