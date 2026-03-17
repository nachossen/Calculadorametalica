/**
 * Figura 1.8-1 — Tablas para el factor topográfico Kzt = (1 + K1·K2·K3)²
 */

/** K1/(H/Lh) ratio por exposición y forma de elevación */
export const TOPO_K1_RATIO = {
  'Loma 2D':    { B: 1.30, C: 1.45, D: 1.55 },
  'Escarpe 2D': { B: 0.75, C: 0.85, D: 0.95 },
  'Colina 3D':  { B: 0.95, C: 1.05, D: 1.15 },
};

/** Factor γ por forma */
export const TOPO_GAMMA = {
  'Loma 2D':    3,
  'Escarpe 2D': 2.5,
  'Colina 3D':  4,
};

/** Factor μ (distancia de atenuación) por forma y lado */
export const TOPO_MU = {
  'Loma 2D':    { bv: 1.5, sv: 1.5 },
  'Escarpe 2D': { bv: 1.5, sv: 4.0 },
  'Colina 3D':  { bv: 1.5, sv: 1.5 },
};

/** K1 en función de H/Lh por tipo (interpolar) */
export const TOPO_K1_TABLE = [
  { hl: 0.20, loma: 0.29, escarpa: 0.17, colina: 0.21 },
  { hl: 0.25, loma: 0.36, escarpa: 0.21, colina: 0.26 },
  { hl: 0.30, loma: 0.43, escarpa: 0.26, colina: 0.32 },
  { hl: 0.35, loma: 0.51, escarpa: 0.30, colina: 0.37 },
  { hl: 0.40, loma: 0.58, escarpa: 0.34, colina: 0.42 },
  { hl: 0.45, loma: 0.65, escarpa: 0.38, colina: 0.47 },
  { hl: 0.50, loma: 0.72, escarpa: 0.43, colina: 0.53 },
];

/** K2 en función de x/Lh (interpolar) */
export const TOPO_K2_TABLE = [
  { xl: 0.00, escarpa: 1.00, otros: 1.00 },
  { xl: 0.50, escarpa: 0.88, otros: 0.67 },
  { xl: 1.00, escarpa: 0.75, otros: 0.33 },
  { xl: 1.50, escarpa: 0.63, otros: 0.00 },
  { xl: 2.00, escarpa: 0.50, otros: 0.00 },
  { xl: 2.50, escarpa: 0.38, otros: 0.00 },
  { xl: 3.00, escarpa: 0.25, otros: 0.00 },
  { xl: 3.50, escarpa: 0.13, otros: 0.00 },
  { xl: 4.00, escarpa: 0.00, otros: 0.00 },
];

/** K3 en función de z/Lh (interpolar) */
export const TOPO_K3_TABLE = [
  { zl: 0.00, loma: 1.00, escarpa: 1.00, colina: 1.00 },
  { zl: 0.10, loma: 0.74, escarpa: 0.78, colina: 0.67 },
  { zl: 0.20, loma: 0.55, escarpa: 0.61, colina: 0.45 },
  { zl: 0.30, loma: 0.41, escarpa: 0.47, colina: 0.30 },
  { zl: 0.40, loma: 0.30, escarpa: 0.37, colina: 0.20 },
  { zl: 0.50, loma: 0.22, escarpa: 0.29, colina: 0.14 },
  { zl: 0.60, loma: 0.17, escarpa: 0.22, colina: 0.09 },
  { zl: 0.70, loma: 0.12, escarpa: 0.17, colina: 0.06 },
  { zl: 0.80, loma: 0.09, escarpa: 0.14, colina: 0.04 },
  { zl: 0.90, loma: 0.07, escarpa: 0.11, colina: 0.03 },
  { zl: 1.00, loma: 0.05, escarpa: 0.08, colina: 0.02 },
  { zl: 1.50, loma: 0.01, escarpa: 0.02, colina: 0.00 },
  { zl: 2.00, loma: 0.00, escarpa: 0.00, colina: 0.00 },
];
