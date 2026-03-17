/**
 * roofTypes/registry.js — Registro de tipologías disponibles
 */

import dosAguas from './dosAguas/index.js';
import unaAgua from './unaAgua/index.js';

/** Array de todas las tipologías registradas */
export const ROOF_TYPES = [dosAguas, unaAgua];

/**
 * Obtiene una tipología por id. Fallback a dosAguas si no se encuentra.
 * @param {string} id
 * @returns {import('./RoofType.js').RoofTypeModule}
 */
export function getRoofType(id) {
  return ROOF_TYPES.find(rt => rt.id === id) ?? dosAguas;
}

/**
 * Mapeo de ids legacy (monolito v7) a ids nuevos.
 * Permite compatibilidad con estado guardado del monolito anterior.
 */
const LEGACY_MAP = {
  '2 aguas': '2aguas',
  '1 agua':  '1agua',
};

/**
 * Normaliza un id de tipología (acepta ids legacy del monolito).
 * @param {string} id
 * @returns {string} id normalizado
 */
export function normalizeRoofTypeId(id) {
  return LEGACY_MAP[id] ?? id;
}
