/**
 * @fileoverview Tabla de densidades y pesos de materiales de construcción
 * para el cálculo de carga muerta (D) según Tabla 3.1 CIRSOC 101-2025.
 *
 * Materiales volumétricos: campo `densidad` en kN/m³.
 * Materiales laminares/superficiales: campo `porM2` en kN/m².
 */

/**
 * @typedef {Object} MaterialVolumen
 * @property {string}  id        - Identificador único
 * @property {string}  nombre    - Nombre descriptivo
 * @property {number}  densidad  - Densidad en kN/m³
 * @property {string}  tipo      - Categoría
 */

/**
 * @typedef {Object} MaterialSuperficial
 * @property {string}  id      - Identificador único
 * @property {string}  nombre  - Nombre descriptivo
 * @property {number}  porM2   - Peso por m² en kN/m²
 * @property {string}  tipo    - Categoría
 * @property {string}  [nota]  - Nota aclaratoria
 */

/** @type {Array<MaterialVolumen | MaterialSuperficial>} */
export const MATERIALES = [
  // ── Hormigones ──
  { id: 'hormigon_armado', nombre: 'Hormigón armado', densidad: 24, tipo: 'hormigón' },
  { id: 'hormigon_simple', nombre: 'Hormigón simple', densidad: 23, tipo: 'hormigón' },
  { id: 'hormigon_liviano', nombre: 'Hormigón liviano', densidad: 18, tipo: 'hormigón' },

  // ── Metales ──
  { id: 'acero', nombre: 'Acero estructural', densidad: 78.5, tipo: 'metal' },
  { id: 'aluminio', nombre: 'Aluminio', densidad: 27, tipo: 'metal' },

  // ── Mampostería ──
  { id: 'mamposteria_maciza', nombre: 'Mampostería ladrillo macizo', densidad: 18, tipo: 'mampostería' },
  { id: 'mamposteria_hueca', nombre: 'Mampostería bloques huecos', densidad: 14, tipo: 'mampostería' },
  { id: 'mamposteria_hueca_rellena', nombre: 'Mampostería bloques huecos rellenos', densidad: 21, tipo: 'mampostería' },

  // ── Maderas ──
  { id: 'madera_blanda', nombre: 'Madera blanda (pino, spruce)', densidad: 6, tipo: 'madera' },
  { id: 'madera_dura', nombre: 'Madera dura (quebracho, lapacho)', densidad: 8, tipo: 'madera' },

  // ── Otros volumétricos ──
  { id: 'vidrio', nombre: 'Vidrio', densidad: 25, tipo: 'vidrio' },
  { id: 'contrapiso', nombre: 'Contrapiso cem./arena/cascote', densidad: 18, tipo: 'relleno' },
  { id: 'arena', nombre: 'Arena seca', densidad: 16, tipo: 'relleno' },
  { id: 'tierra', nombre: 'Tierra compactada', densidad: 18, tipo: 'relleno' },

  // ── Cubiertas (superficiales) ──
  { id: 'chapa_galvanizada', nombre: 'Chapa galvanizada (BWG 24)', porM2: 0.08, tipo: 'cubierta' },
  { id: 'chapa_acero_04', nombre: 'Chapa acanalada acero 0.4 mm', porM2: 0.04, tipo: 'cubierta' },
  { id: 'chapa_acero_07', nombre: 'Chapa acanalada acero 0.7 mm', porM2: 0.07, tipo: 'cubierta' },
  { id: 'chapa_acero_10', nombre: 'Chapa acanalada acero 1.0 mm', porM2: 0.10, tipo: 'cubierta' },
  { id: 'panel_sandwich_pur', nombre: 'Panel sándwich PUR (50 mm)', porM2: 0.12, tipo: 'cubierta' },
  { id: 'teja_ceramica', nombre: 'Teja cerámica tipo español', porM2: 0.90, tipo: 'cubierta' },
  { id: 'teja_mortero', nombre: 'Teja mortero de cemento', porM2: 0.50, tipo: 'cubierta' },
  { id: 'chapa_fibra', nombre: 'Chapa fibra orgánica', porM2: 0.03, tipo: 'cubierta' },
  { id: 'membrana_asfaltica', nombre: 'Membrana asfáltica', porM2: 0.04, tipo: 'cubierta' },

  // ── Pisos ──
  { id: 'baldosa_ceramica', nombre: 'Baldosa cerámica (incluye pegamento)', porM2: 0.28, tipo: 'piso' },
  { id: 'porcelanato', nombre: 'Porcelanato (incluye pegamento)', porM2: 0.20, tipo: 'piso' },
  { id: 'mosaico_calcareo', nombre: 'Mosaico calcáreo', porM2: 0.42, tipo: 'piso' },

  // ── Tabiques / Divisorios ──
  { id: 'placa_yeso_simple', nombre: 'Tabique placa de yeso simple', porM2: 0.35, tipo: 'tabique' },
  { id: 'placa_yeso_doble', nombre: 'Tabique placa de yeso doble', porM2: 0.55, tipo: 'tabique' },
  { id: 'tabiqueria_equiv', nombre: 'Tabiquería equivalente (Art. 3.1.4)', porM2: 0.75, tipo: 'tabique',
    nota: 'Si carga de tabiques < 3.85 kN/m², agregar 0.75 kN/m² por particiones' },

  // ── Terminaciones ──
  { id: 'cielorraso_suspendido', nombre: 'Cielorraso suspendido', porM2: 0.20, tipo: 'terminación' },
  { id: 'cielorraso_aplicado', nombre: 'Cielorraso aplicado', porM2: 0.30, tipo: 'terminación' },
  { id: 'aislacion_eps', nombre: 'Aislación térmica EPS', porM2: 0.15, tipo: 'aislación' },
  { id: 'aislacion_lana', nombre: 'Aislación lana de vidrio', porM2: 0.05, tipo: 'aislación' },
];
