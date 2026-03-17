/**
 * @fileoverview Cálculo de carga muerta (D) a partir de capas de materiales.
 *
 * Cada capa se resuelve según el tipo de material:
 *   - Materiales volumétricos (con `densidad` en kN/m³): D_capa = densidad × espesor
 *   - Materiales superficiales (con `porM2` en kN/m²):  D_capa = porM2 × (espesor o 1)
 *
 * El espesor para materiales volumétricos se expresa en metros.
 * Para chapa galvanizada el espesor se expresa en mm y porM2 es kN/m²/mm.
 */

import { MATERIALES } from '../data/materiales.js';

/**
 * @typedef {Object} Layer
 * @property {string}  materialId - Identificador del material en la tabla MATERIALES
 * @property {number}  [espesor]  - Espesor de la capa. En metros para materiales
 *                                   volumétricos, en mm para chapa galvanizada.
 *                                   Ignorado para materiales superficiales sin
 *                                   variación por espesor (membrana, cielorraso, EPS).
 * @property {number}  [area]     - Área tributaria en m² (para obtener carga total).
 *                                   Si se omite, el resultado es por m².
 */

/**
 * @typedef {Object} DeadLoadResult
 * @property {number}            totalPorM2 - Carga muerta total en kN/m²
 * @property {number|null}       totalKN    - Carga muerta total en kN (si se proveyó área)
 * @property {Array<Object>}     detalle    - Desglose por capa
 */

/**
 * Calcula la carga muerta (D) sumando la contribución de cada capa.
 *
 * @param {Layer[]} layers - Arreglo de capas que componen el elemento estructural
 * @returns {DeadLoadResult} Resultado con el total y el desglose por capa
 * @throws {Error} Si un materialId no se encuentra en la tabla MATERIALES
 *
 * @example
 * import { calcDeadLoad } from './deadLoad.js';
 *
 * const result = calcDeadLoad([
 *   { materialId: 'hormigon_armado', espesor: 0.15 },
 *   { materialId: 'membrana_asfaltica' },
 *   { materialId: 'cielorraso_suspendido' },
 * ]);
 * // result.totalPorM2 => 3.84  (24×0.15 + 0.04 + 0.2)
 */
export function calcDeadLoad(layers) {
  let totalPorM2 = 0;
  let areaComun = null;
  const detalle = [];

  for (const layer of layers) {
    const material = MATERIALES.find((m) => m.id === layer.materialId);
    if (!material) {
      throw new Error(
        `Material no encontrado: "${layer.materialId}". ` +
          `IDs válidos: ${MATERIALES.map((m) => m.id).join(', ')}`
      );
    }

    let cargaPorM2 = 0;

    if ('densidad' in material) {
      // Material volumétrico: densidad (kN/m³) × espesor (m)
      const espesor = layer.espesor ?? 0;
      cargaPorM2 = material.densidad * espesor;
    } else if ('porM2' in material) {
      if (material.id === 'chapa_galvanizada') {
        // Chapa: porM2 es kN/m² por mm de espesor
        const espesorMM = layer.espesor ?? 1;
        cargaPorM2 = material.porM2 * espesorMM;
      } else {
        // Material superficial de peso fijo por m²
        cargaPorM2 = material.porM2;
      }
    }

    totalPorM2 += cargaPorM2;

    if (layer.area != null) {
      areaComun = layer.area;
    }

    detalle.push({
      materialId: layer.materialId,
      nombre: material.nombre,
      cargaPorM2: Math.round(cargaPorM2 * 1000) / 1000,
    });
  }

  totalPorM2 = Math.round(totalPorM2 * 1000) / 1000;

  return {
    totalPorM2,
    totalKN: areaComun != null
      ? Math.round(totalPorM2 * areaComun * 1000) / 1000
      : null,
    detalle,
  };
}
