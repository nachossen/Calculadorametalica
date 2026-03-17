/** Fig. 1.5-1 A-D — Velocidades básicas de viento por ciudad (m/s) */
export const VELOCIDADES_ARG = {
  'Bahía Blanca':           { V300: 62.8, V700: 67.4, V1700: 72.2 },
  'Bariloche':              { V300: 52.5, V700: 56.3, V1700: 60.4 },
  'Buenos Aires':           { V300: 51.4, V700: 55.1, V1700: 59.1 },
  'Catamarca':              { V300: 49.1, V700: 52.7, V1700: 56.5 },
  'Comodoro Rivadavia':     { V300: 77.1, V700: 82.7, V1700: 88.7 },
  'Córdoba':                { V300: 51.4, V700: 55.1, V1700: 59.1 },
  'Corrientes':             { V300: 52.5, V700: 56.3, V1700: 60.4 },
  'Formosa':                { V300: 51.4, V700: 55.1, V1700: 59.1 },
  'La Plata':               { V300: 52.5, V700: 56.3, V1700: 60.4 },
  'La Rioja':               { V300: 50.3, V700: 53.9, V1700: 57.8 },
  'Mar del Plata':          { V300: 58.3, V700: 62.5, V1700: 67.0 },
  'Mendoza':                { V300: 44.6, V700: 47.8, V1700: 51.2 },
  'Neuquén':                { V300: 54.8, V700: 58.8, V1700: 63.0 },
  'Paraná':                 { V300: 59.4, V700: 63.7, V1700: 68.3 },
  'Posadas':                { V300: 51.4, V700: 55.1, V1700: 59.1 },
  'Rawson':                 { V300: 68.5, V700: 73.5, V1700: 78.8 },
  'Resistencia':            { V300: 51.4, V700: 55.1, V1700: 59.1 },
  'Río Gallegos':           { V300: 68.5, V700: 73.5, V1700: 78.8 },
  'Rosario':                { V300: 57.1, V700: 61.2, V1700: 65.7 },
  'Salta':                  { V300: 40.0, V700: 42.9, V1700: 46.0 },
  'San Juan':               { V300: 45.7, V700: 49.0, V1700: 52.5 },
  'San Luis':               { V300: 51.4, V700: 55.1, V1700: 59.1 },
  'San Miguel de Tucumán':  { V300: 45.7, V700: 49.0, V1700: 52.5 },
  'San Salvador de Jujuy':  { V300: 38.8, V700: 41.6, V1700: 44.7 },
  'Santa Fe':               { V300: 58.3, V700: 62.5, V1700: 67.0 },
  'Santa Rosa':             { V300: 57.1, V700: 61.2, V1700: 65.7 },
  'Santiago del Estero':    { V300: 49.1, V700: 52.7, V1700: 56.5 },
  'Ushuaia':                { V300: 68.5, V700: 73.5, V1700: 78.8 },
  'Viedma':                 { V300: 68.5, V700: 73.5, V1700: 78.8 },
};

/** Tabla 1.14-1 — Categoría de Riesgo */
export const CAT_RIESGO = {
  'I':   { mri: 300,  col: 'V300',  d: 'Bajo riesgo' },
  'II':  { mri: 700,  col: 'V700',  d: 'Edificios estándar' },
  'III': { mri: 1700, col: 'V1700', d: 'Riesgo sustancial' },
  'IV':  { mri: 1700, col: 'V1700', d: 'Instalaciones esenciales' },
};

/**
 * Obtiene la velocidad básica para una localidad y categoría de riesgo.
 * @param {string} localidad
 * @param {string} riesgo — 'I' | 'II' | 'III' | 'IV'
 * @returns {number|null} V en m/s, o null si no se encuentra
 */
export function getVelocidad(localidad, riesgo) {
  const entry = VELOCIDADES_ARG[localidad];
  if (!entry) return null;
  const col = CAT_RIESGO[riesgo]?.col;
  return col ? entry[col] : null;
}
