/**
 * @fileoverview Reducción de sobrecarga de uso (carga viva) según CIRSOC 101-2025
 * Art. 4.7.
 *
 * Fórmula (Ec. 4.1):  L = L0 × (0.25 + 4.57 / sqrt(KLL × AT))
 *
 * Restricciones:
 *   - L >= 0.50 × L0 para elementos que soportan un solo piso
 *   - L >= 0.40 × L0 para elementos que soportan dos o más pisos
 *   - No se reduce si L0 > 5.0 kN/m² (excepto 20% para 2+ pisos, Art. 4.7.3)
 *   - No se reduce para usos de asamblea ni estacionamientos
 *   - KLL × AT ≥ 37 m² (Art. 4.7.2)
 */

/**
 * Factores de elemento KLL según Tabla 4.2 CIRSOC 101-2025.
 *
 * @readonly
 * @enum {number}
 */
export const KLL_FACTORS = {
  /** Columnas interiores */
  COLUMNA_INTERIOR: 4,
  /** Columnas exteriores sin losas en voladizo */
  COLUMNA_EXTERIOR_SIN_VOLADIZO: 4,
  /** Columnas de borde con losas en voladizo */
  COLUMNA_BORDE_CON_VOLADIZO: 3,
  /** Columnas de esquina con losas en voladizo */
  COLUMNA_ESQUINA: 2,
  /** Vigas de borde sin losas en voladizo */
  VIGA_BORDE: 2,
  /** Vigas interiores */
  VIGA_INTERIOR: 2,
  /** Vigas de borde con losa en voladizo */
  VIGA_BORDE_CON_VOLADIZO: 1,
  /** Losa en una dirección */
  LOSA_UNA_DIR: 1,
  /** Losa en dos direcciones */
  LOSA_DOS_DIR: 1,
  /** Voladizo (cantilever) */
  VOLADIZO: 1,
};

/**
 * IDs de usos para los que no se permite reducir la carga viva.
 * @type {Set<string>}
 */
const USOS_SIN_REDUCCION = new Set([
  'salon_fija',
  'salon_movil',
  'estacionamiento',
]);

/**
 * @typedef {Object} LiveLoadReductionResult
 * @property {number}  L          - Carga viva reducida (kN/m²)
 * @property {number}  L0         - Carga viva nominal de entrada (kN/m²)
 * @property {number}  factor     - Factor de reducción aplicado (L / L0)
 * @property {boolean} reducida   - Indica si se aplicó reducción
 * @property {string}  [motivo]   - Motivo si no se redujo
 */

/**
 * Calcula la carga viva reducida según CIRSOC 101.
 *
 * @param {number}  L0      - Sobrecarga nominal sin reducir (kN/m²)
 * @param {number}  KLL     - Factor de elemento (ver KLL_FACTORS)
 * @param {number}  AT      - Área tributaria en m²
 * @param {Object}  [opts]  - Opciones adicionales
 * @param {number}  [opts.pisos=1]     - Cantidad de pisos soportados por el
 *                                        elemento (afecta el límite mínimo)
 * @param {string}  [opts.usoId]       - ID de uso (para verificar si es asamblea
 *                                        o estacionamiento)
 * @returns {LiveLoadReductionResult}
 *
 * @example
 * import { reduceLiveLoad, KLL_FACTORS } from './liveLoadReduction.js';
 *
 * const result = reduceLiveLoad(2.0, KLL_FACTORS.COLUMNA_INTERIOR, 80);
 * // result.L  => 1.31 kN/m²
 * // result.factor => 0.655
 */
export function reduceLiveLoad(L0, KLL, AT, opts = {}) {
  const { pisos = 1, usoId } = opts;

  // Verificar si el uso impide la reducción
  if (usoId && USOS_SIN_REDUCCION.has(usoId)) {
    return {
      L: L0,
      L0,
      factor: 1.0,
      reducida: false,
      motivo: 'Uso de asamblea o estacionamiento: no se permite reducción',
    };
  }

  // Art. 4.7.3: No reducir si L0 > 5.0 kN/m², EXCEPTO 20% para 2+ pisos
  if (L0 > 5.0) {
    if (pisos >= 2) {
      // Excepción Art. 4.7.3: reducción del 20% permitida para 2+ pisos
      const factor = 0.80;
      const L = Math.round(L0 * factor * 1000) / 1000;
      return {
        L, L0, factor, reducida: true,
        motivo: 'L0 > 5.0 kN/m², pero 2+ pisos → reducción 20% (Art. 4.7.3)',
      };
    }
    return {
      L: L0, L0, factor: 1.0, reducida: false,
      motivo: 'L0 > 5.0 kN/m²: no se permite reducción (Art. 4.7.3)',
    };
  }

  // Área de influencia
  const AI = KLL * AT;

  // Art. 4.7.2: Solo reducir si KLL×AT ≥ 37 m²
  if (AI < 37) {
    return {
      L: L0, L0, factor: 1.0, reducida: false,
      motivo: 'Área de influencia KLL×AT < 37 m²: no se reduce (Art. 4.7.2)',
    };
  }

  // Ec. 4.1: Fórmula de reducción
  let factor = 0.25 + 4.57 / Math.sqrt(AI);

  // Límites mínimos
  const limiteMin = pisos >= 2 ? 0.40 : 0.50;
  if (factor < limiteMin) {
    factor = limiteMin;
  }

  // No puede exceder 1.0
  if (factor > 1.0) {
    factor = 1.0;
  }

  const L = Math.round(L0 * factor * 1000) / 1000;
  factor = Math.round(factor * 1000) / 1000;

  return {
    L, L0, factor, reducida: factor < 1.0,
  };
}
