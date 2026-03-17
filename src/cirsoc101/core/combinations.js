/**
 * @fileoverview Evaluación de combinaciones de carga según CIRSOC 101.
 *
 * Recibe las cargas individuales y el método de diseño (LRFD o ASD),
 * evalúa cada combinación y determina la combinación gobernante (máxima).
 *
 * Para las combinaciones que incluyen alternativas (Lr | S | R),
 * se toma el máximo de las tres cargas multiplicado por el factor.
 * Para la combinación LRFD 3 que incluye (L | 0.5W), se toma el
 * mayor de L×1.0 o W×0.5.
 */

import { COMBOS_LRFD, COMBOS_ASD } from '../data/combinaciones.js';

/**
 * @typedef {Object} Loads
 * @property {number} [D=0]  - Carga muerta (kN/m² o kN)
 * @property {number} [L=0]  - Carga viva
 * @property {number} [Lr=0] - Carga viva de techo
 * @property {number} [S=0]  - Carga de nieve
 * @property {number} [R=0]  - Carga de lluvia / agua estancada
 * @property {number} [W=0]  - Carga de viento
 * @property {number} [E=0]  - Carga sísmica
 */

/**
 * @typedef {Object} ComboResult
 * @property {number} id      - Número de la combinación
 * @property {string} label   - Expresión legible
 * @property {number} value   - Valor calculado de la combinación
 */

/**
 * @typedef {Object} CombinationsResult
 * @property {ComboResult[]} combos    - Resultados de cada combinación
 * @property {ComboResult}   governing - Combinación gobernante (mayor valor)
 * @property {string}        method    - Método utilizado ('LRFD' | 'ASD')
 */

/**
 * Evalúa una combinación individual considerando las alternativas
 * codificadas en la norma.
 *
 * @param {Object}  combo   - Definición de la combinación (de COMBOS_LRFD o COMBOS_ASD)
 * @param {Loads}   loads   - Cargas de entrada
 * @param {string}  method  - 'LRFD' o 'ASD'
 * @returns {number} Valor de la combinación
 */
function evaluateCombo(combo, loads, method) {
  const { D = 0, L = 0, Lr = 0, S = 0, R = 0, W = 0, E = 0 } = loads;
  const f = combo.factors;

  // Para combinaciones con (Lr | S | R), se usa el máximo de las tres
  // multiplicado por el factor correspondiente (todos comparten el mismo factor).
  const maxLrSR = Math.max(Lr, S, R);

  // Factor para Lr|S|R: tomamos el factor de Lr (son iguales para Lr, S, R)
  const fLrSR = f.Lr; // igual a f.S e igual a f.R en las tablas

  if (method === 'LRFD' && combo.id === 3) {
    // Combinación LRFD 3: 1.2D + 1.6(Lr|S|R) + (L | 0.5W)
    // Alternativa: el mayor entre L×1.0 y W×0.5
    const altLW = Math.max(L * f.L, W * f.W);
    return f.D * D + fLrSR * maxLrSR + altLW;
  }

  // Caso general
  let value = f.D * D;
  value += f.L * L;
  value += fLrSR * maxLrSR;
  value += f.W * W;
  value += f.E * E;

  return value;
}

/**
 * Calcula todas las combinaciones de carga según el método indicado
 * y determina la combinación gobernante.
 *
 * @param {Loads}  loads   - Objeto con las cargas de cada tipo
 * @param {'LRFD'|'ASD'} method - Método de diseño
 * @returns {CombinationsResult}
 * @throws {Error} Si el método no es 'LRFD' ni 'ASD'
 *
 * @example
 * import { calcCombinations } from './combinations.js';
 *
 * const result = calcCombinations(
 *   { D: 4.0, L: 2.0, Lr: 0.96, S: 0, R: 0, W: 1.5, E: 0 },
 *   'LRFD'
 * );
 * // result.governing => { id: 2, label: '1.2D + 1.6L + 0.5(Lr|S|R)', value: 8.48 }
 */
export function calcCombinations(loads, method) {
  const upperMethod = method.toUpperCase();
  if (upperMethod !== 'LRFD' && upperMethod !== 'ASD') {
    throw new Error(
      `Método de diseño no válido: "${method}". Use 'LRFD' o 'ASD'.`
    );
  }

  const table = upperMethod === 'LRFD' ? COMBOS_LRFD : COMBOS_ASD;

  const combos = table.map((combo) => {
    const value = evaluateCombo(combo, loads, upperMethod);
    return {
      id: combo.id,
      label: combo.label,
      value: Math.round(value * 1000) / 1000,
    };
  });

  // Determinar la combinación gobernante (máximo valor)
  const governing = combos.reduce((max, c) =>
    c.value > max.value ? c : max
  );

  return {
    combos,
    governing: { ...governing },
    method: upperMethod,
  };
}
