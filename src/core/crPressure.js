/**
 * core/crPressure.js — Presión de diseño para Componentes y Revestimientos
 * Ec. 5.3-1: p = qh × [(GCp) - (GCpi)]
 * CIRSOC 102-2025
 */

/**
 * Calcula la presión C&R para una zona.
 * @param {number} qh — presión dinámica en cubierta [kN/m²]
 * @param {{ pos: number, neg: number }} gcp — GCp de la zona
 * @param {{ p: number, n: number }} gcpi — GCpi del cerramiento
 * @returns {{ pPos: number, pNeg: number }} presiones en kN/m²
 */
export function calcCrPressure(qh, gcp, gcpi) {
  return {
    pPos: qh * (gcp.pos - gcpi.n),   // max presión: GCp+ con GCpi negativo
    pNeg: qh * (gcp.neg - gcpi.p),   // max succión: GCp- con GCpi positivo
  };
}

/**
 * Calcula presiones C&R para todas las zonas.
 * @param {number} qh
 * @param {Object} allGCp — { [zone]: { pos, neg } }
 * @param {{ p: number, n: number }} gcpi
 * @returns {Object} { [zone]: { pPos, pNeg, gcpPos, gcpNeg } }
 */
export function calcAllCrPressures(qh, allGCp, gcpi) {
  const result = {};
  for (const [zone, gcp] of Object.entries(allGCp)) {
    const p = calcCrPressure(qh, gcp, gcpi);
    result[zone] = { ...p, gcpPos: gcp.pos, gcpNeg: gcp.neg };
  }
  return result;
}
