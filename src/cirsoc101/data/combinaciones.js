/**
 * @fileoverview Combinaciones de carga según CIRSOC 101 para los métodos
 * LRFD (Diseño por Resistencia) y ASD (Diseño por Tensiones Admisibles).
 *
 * Cada combinación define los factores que multiplican a cada tipo de carga:
 *   D  = Carga muerta
 *   L  = Carga viva (sobrecarga de uso)
 *   Lr = Carga viva de techo
 *   S  = Carga de nieve
 *   R  = Carga de lluvia / agua estancada
 *   W  = Carga de viento
 *   E  = Carga sísmica
 *
 * Donde la norma indica alternativas (Lr | S | R), se toma el máximo de las
 * tres multiplicado por el factor correspondiente. La lógica de evaluación
 * se implementa en el módulo core/combinations.js.
 */

/**
 * @typedef {Object} FactoresCarga
 * @property {number} D  - Factor para carga muerta
 * @property {number} L  - Factor para carga viva
 * @property {number} Lr - Factor para carga viva de techo
 * @property {number} S  - Factor para carga de nieve
 * @property {number} R  - Factor para carga de lluvia
 * @property {number} W  - Factor para carga de viento
 * @property {number} E  - Factor para carga sísmica
 */

/**
 * @typedef {Object} Combinacion
 * @property {number}         id      - Número de la combinación
 * @property {string}         label   - Expresión legible de la combinación
 * @property {FactoresCarga}  factors - Factores de cada tipo de carga
 */

/**
 * Combinaciones LRFD (Load and Resistance Factor Design) según CIRSOC 101.
 *
 * Para combinaciones con alternativas (Lr | S | R) o (L | 0.5W), la
 * evaluación toma el valor más desfavorable. Estos factores representan
 * el caso base; la función de cálculo maneja las alternativas.
 *
 * @type {Combinacion[]}
 */
export const COMBOS_LRFD = [
  {
    id: 1,
    label: '1.4D',
    factors: { D: 1.4, L: 0, Lr: 0, S: 0, R: 0, W: 0, E: 0 },
  },
  {
    id: 2,
    label: '1.2D + 1.6L + 0.5(Lr|S|R)',
    factors: { D: 1.2, L: 1.6, Lr: 0.5, S: 0.5, R: 0.5, W: 0, E: 0 },
  },
  {
    id: 3,
    label: '1.2D + 1.6(Lr|S|R) + (L|0.5W)',
    factors: { D: 1.2, L: 1.0, Lr: 1.6, S: 1.6, R: 1.6, W: 0.5, E: 0 },
  },
  {
    id: 4,
    label: '1.2D + 1.0W + L + 0.5(Lr|S|R)',
    factors: { D: 1.2, L: 1.0, Lr: 0.5, S: 0.5, R: 0.5, W: 1.0, E: 0 },
  },
  {
    id: 5,
    label: '1.2D + 1.0E + L + 0.2S',
    factors: { D: 1.2, L: 1.0, Lr: 0, S: 0.2, R: 0, W: 0, E: 1.0 },
  },
  {
    id: 6,
    label: '0.9D + 1.0W',
    factors: { D: 0.9, L: 0, Lr: 0, S: 0, R: 0, W: 1.0, E: 0 },
  },
  {
    id: 7,
    label: '0.9D + 1.0E',
    factors: { D: 0.9, L: 0, Lr: 0, S: 0, R: 0, W: 0, E: 1.0 },
  },
];

/**
 * Combinaciones ASD (Allowable Stress Design) según CIRSOC 101.
 *
 * @type {Combinacion[]}
 */
export const COMBOS_ASD = [
  {
    id: 1,
    label: 'D',
    factors: { D: 1.0, L: 0, Lr: 0, S: 0, R: 0, W: 0, E: 0 },
  },
  {
    id: 2,
    label: 'D + L',
    factors: { D: 1.0, L: 1.0, Lr: 0, S: 0, R: 0, W: 0, E: 0 },
  },
  {
    id: 3,
    label: 'D + (Lr|S|R)',
    factors: { D: 1.0, L: 0, Lr: 1.0, S: 1.0, R: 1.0, W: 0, E: 0 },
  },
  {
    id: 4,
    label: 'D + 0.75L + 0.75(Lr|S|R)',
    factors: { D: 1.0, L: 0.75, Lr: 0.75, S: 0.75, R: 0.75, W: 0, E: 0 },
  },
  {
    id: 5,
    label: 'D + 0.6W',
    factors: { D: 1.0, L: 0, Lr: 0, S: 0, R: 0, W: 0.6, E: 0 },
  },
  {
    id: 6,
    label: 'D + 0.75L + 0.75(0.6W) + 0.75(Lr|S|R)',
    factors: { D: 1.0, L: 0.75, Lr: 0.75, S: 0.75, R: 0.75, W: 0.45, E: 0 },
  },
  {
    id: 7,
    label: '0.6D + 0.6W',
    factors: { D: 0.6, L: 0, Lr: 0, S: 0, R: 0, W: 0.6, E: 0 },
  },
  {
    id: 8,
    label: '0.6D + 0.7E',
    factors: { D: 0.6, L: 0, Lr: 0, S: 0, R: 0, W: 0, E: 0.7 },
  },
];
