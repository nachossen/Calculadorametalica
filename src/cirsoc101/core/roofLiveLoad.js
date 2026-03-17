/**
 * @fileoverview Sobrecarga de cubierta (Lr) según CIRSOC 101-2025 Art. 4.8.
 *
 * Dos fórmulas según peso total de cubierta:
 *
 * 4.8.1.(a) PESADAS (peso > 0.5 kN/m²):
 *   Lr = 0.96 × R1 × R2   con 0.58 ≤ Lr ≤ 0.96
 *
 * 4.8.1.(b) LIVIANAS (peso ≤ 0.5 kN/m²):
 *   Lr = 0.45 × R1 × R2   con 0.203 ≤ Lr ≤ 0.765
 */

/**
 * R1 para cubiertas PESADAS (Art. 4.8.1.a)
 * @param {number} At - Área tributaria en m²
 */
function R1_pesada(At) {
  if (At <= 20) return 1.0;
  if (At >= 60) return 0.6;
  return 1.2 - 0.01076 * At;
}

/**
 * R2 para cubiertas PESADAS (Art. 4.8.1.a)
 * F = 0.12 × pendiente(%) para cubiertas lineales
 * F = 32 × (f/L) para arcos/cúpulas
 * @param {number} F - Factor de pendiente
 */
function R2_pesada(F) {
  if (F <= 4) return 1.0;
  if (F >= 12) return 0.6;
  return 1.2 - 0.05 * F;
}

/**
 * R1 para cubiertas LIVIANAS (Art. 4.8.1.b)
 * @param {number} At - Área tributaria en m²
 */
function R1_liviana(At) {
  if (At <= 20) return 1.0;
  if (At >= 60) return 0.75;
  return 1.125 - 0.00625 * At;
}

/**
 * R2 para cubiertas LIVIANAS (Art. 4.8.1.b)
 * p = pendiente(%) para cubiertas lineales
 * p = 200×(f/L) para arcos/cúpulas
 * @param {number} p - Pendiente en %
 */
function R2_liviana(p) {
  if (p < 3) return 1.70;
  if (p > 55) return 0.60;
  return 1.04 - 0.008 * p;
}

/**
 * Convierte ángulo en grados a pendiente en %.
 * @param {number} theta - Ángulo en grados
 * @returns {number} Pendiente en %
 */
export function thetaToPendiente(theta) {
  return Math.tan(theta * Math.PI / 180) * 100;
}

/**
 * @typedef {Object} RoofLiveLoadResult
 * @property {number}  Lr    - Sobrecarga de cubierta (kN/m²)
 * @property {number}  R1    - Factor de área tributaria
 * @property {number}  R2    - Factor de pendiente
 * @property {string}  tipo  - 'pesada' | 'liviana'
 * @property {number}  F     - Factor F usado (pesadas) o pendiente p (livianas)
 * @property {number}  coef  - Coeficiente base (0.96 o 0.45)
 * @property {number[]} limites - [min, max] de Lr
 */

/**
 * Calcula Lr según CIRSOC 101-2025 Art. 4.8.
 *
 * @param {Object}  params
 * @param {number}  params.At          - Área tributaria en m²
 * @param {number}  params.theta       - Pendiente del techo en grados
 * @param {number}  [params.pesoTotal] - Peso total de cubierta (kN/m²). Si > 0.5 → pesada
 * @param {number}  [params.pendientePct] - Pendiente en % (alternativa a theta)
 * @returns {RoofLiveLoadResult}
 */
export function calcRoofLiveLoad(params) {
  const { At = 20, theta = 0, pesoTotal = 1.0, pendientePct } = typeof params === 'object' ? params : {};

  const pct = pendientePct != null ? pendientePct : thetaToPendiente(theta);
  const esLiviana = pesoTotal <= 0.5;

  let R1, R2, F, Lr, coef, limites;

  if (esLiviana) {
    // Art. 4.8.1.(b) — Livianas
    coef = 0.45;
    limites = [0.203, 0.765];
    R1 = R1_liviana(At);
    F = pct; // p = pendiente(%)
    R2 = R2_liviana(F);
  } else {
    // Art. 4.8.1.(a) — Pesadas
    coef = 0.96;
    limites = [0.58, 0.96];
    R1 = R1_pesada(At);
    F = 0.12 * pct; // F = 0.12 × pendiente(%)
    R2 = R2_pesada(F);
  }

  Lr = coef * R1 * R2;
  Lr = Math.max(limites[0], Math.min(limites[1], Lr));
  Lr = Math.round(Lr * 1000) / 1000;
  R1 = Math.round(R1 * 1000) / 1000;
  R2 = Math.round(R2 * 1000) / 1000;

  return {
    Lr,
    R1,
    R2,
    tipo: esLiviana ? 'liviana' : 'pesada',
    F: Math.round(F * 100) / 100,
    coef,
    limites,
    pendientePct: Math.round(pct * 100) / 100,
    pesoTotal,
  };
}
