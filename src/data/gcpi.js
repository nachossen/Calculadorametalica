/**
 * Tabla 1.11-1 — Coeficientes de Presión Interna GCpi
 * p = positivo (presión hacia adentro), n = negativo (succión hacia afuera)
 */
export const T_1_11_1 = {
  'Abierto':             { p: 0,    n: 0 },
  'Parcialmente Abierto':{ p: 0.18, n: -0.18 },
  'Parcialmente Cerrado':{ p: 0.55, n: -0.55 },
  'Cerrado':             { p: 0.18, n: -0.18 },
};

/**
 * Retorna los coeficientes GCpi según la clasificación de cerramiento.
 * @param {string} enclosure
 * @returns {{ p: number, n: number }}
 */
export function getGCpi(enclosure) {
  return T_1_11_1[enclosure] ?? T_1_11_1['Cerrado'];
}
