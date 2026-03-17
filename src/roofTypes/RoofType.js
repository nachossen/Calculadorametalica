/**
 * roofTypes/RoofType.js — Contrato que cada tipología debe cumplir (duck typing).
 *
 * @typedef {Object} RoofTypeModule
 *
 * @property {string}   id          — Clave única: '2aguas', '1agua', etc.
 * @property {string}   label       — Nombre para mostrar: 'Cubierta a 2 aguas'
 * @property {string}   icon        — Emoji: '⛺' | '⬔'
 * @property {boolean}  available   — false = "próximamente" en el selector
 *
 * @property {Object}   defaultInputs
 *   Inputs específicos de esta tipología (se mergean con los globales).
 *
 * @property {Function} inputFields
 *   (inp, onChange) => JSX[]
 *   Retorna los campos de input específicos de esta tipología.
 *
 * @property {Function} calcGeometry
 *   (inp) => { theta, h, slopeLen, halfSpan, Beff, Leff, hOverL, isNorm, is1agua, wl, ...extras }
 *   Calcula la geometría derivada a partir de los inputs.
 *
 * @property {Function} getCp
 *   (theta, hOverL, isNorm, LB) => { cpWW, cpLW, cpLat, cpRBV, cpRSV, roofMode }
 *   Retorna los coeficientes de presión para la cubierta.
 *   cpRBV/cpRSV pueden ser número o {min, max}.
 *
 * @property {Function} calcFrameForces
 *   (pressures, geometry, sep, supportType) => {
 *     sep, slopeLen, is1agua, isEmp,
 *     w_ww_max, w_ww_min, w_lw_max, w_lw_min,
 *     w_rbv_max, w_rbv_min, w_rsv_max, w_rsv_min,
 *     H_walls, V_roof, M_bv, M_sv,
 *     Rx_bv, Rx_sv, Ry_bv, Ry_sv
 *   }
 *
 * @property {Function} Render2D
 *   React component: ({ r, ff, W, H }) => JSX
 *
 * @property {Function} Render3D
 *   React component: ({ r, rY, rX }) => JSX
 */

// Este archivo solo documenta la interfaz, no exporta código ejecutable.
export default {};
