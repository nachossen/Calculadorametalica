/**
 * roofTypes/dosAguas/frameForces.js — Cargas en pórtico y reacciones (2 aguas)
 */

/**
 * Calcula cargas distribuidas [kN/m] y reacciones en base.
 * @param {Object} pressures — { pWW, pLW, pRBVmax, pRBVmin, pRSV }
 * @param {Object} geo — geometría de calcGeometry()
 * @param {number} sep — separación entre pórticos [m]
 * @param {string} supportType — 'Empotrado' | 'Articulado'
 * @returns {Object} fuerzas en pórtico
 */
export function calcFrameForces(pressures, geo, sep, supportType) {
  const { pWW, pLW, pRBVmax, pRBVmin, pRSV } = pressures;
  const { theta, he, Beff } = geo;
  const isEmp = supportType === 'Empotrado';

  const thetaRad = theta * Math.PI / 180;
  const cosT = Math.cos(thetaRad);

  // Longitud del faldón
  const slopeLen = (Beff / 2) / Math.cos(thetaRad);

  // Cargas distribuidas [kN/m] = presión [Pa] × separación [m] / 1000
  const w_ww_max  =  pWW.max    * sep / 1000;
  const w_ww_min  =  pWW.min    * sep / 1000;
  const w_lw_max  =  pLW.max    * sep / 1000;
  const w_lw_min  =  pLW.min    * sep / 1000;
  const w_rbv_max =  pRBVmax.max * sep / 1000;
  const w_rbv_min =  pRBVmin.min * sep / 1000;
  const w_rsv_max =  pRSV.max    * sep / 1000;
  const w_rsv_min =  pRSV.min    * sep / 1000;

  // --- Equilibrio estático ---
  // Fuerza horizontal total de paredes [kN]
  const H_walls = (pWW.max + pLW.max) * he * sep / 1000;

  // Fuerza vertical total de cubierta [kN] (componente vertical de cargas normales)
  const V_roof = w_rbv_min * cosT * slopeLen + w_rsv_min * cosT * slopeLen;

  // Reacciones horizontales: siempre se reparten por simetría
  const Rx_bv = H_walls / 2;
  const Rx_sv = H_walls / 2;

  // Reacciones verticales: reparto por simetría
  const Ry_bv = V_roof / 2;
  const Ry_sv = V_roof / 2;

  // Momentos en base
  // Empotrado: barra biempotrada con carga distribuida → M = w·h²/12 (extremos)
  // Articulado: M = 0 (rótula en base, no toma momento)
  const M_bv = isEmp ? w_ww_max * he * he / 12 : 0;
  const M_sv = isEmp ? w_lw_min * he * he / 12 : 0;

  return {
    sep, slopeLen, is1agua: false, isEmp,
    w_ww_max, w_ww_min, w_lw_max, w_lw_min,
    w_rbv_max, w_rbv_min, w_rsv_max, w_rsv_min,
    H_walls, V_roof, M_bv, M_sv,
    Rx_bv, Rx_sv, Ry_bv, Ry_sv,
  };
}
