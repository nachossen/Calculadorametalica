/**
 * @fileoverview Tabla C 5.1 — Carga hidráulica en desagües (CIRSOC 101-2025)
 * dh = carga hidráulica en la entrada del desagüe [mm]
 * Q = caudal de lluvia [L/s]
 *
 * Tipos de desagüe:
 * - circ_102: Desagüe circular 102 mm (4")
 * - circ_152: Desagüe circular 152 mm (6")
 * - circ_203: Desagüe circular 203 mm (8")
 * - canal_152: Canal abierto 152 mm ancho
 * - canal_610: Canal abierto 610 mm ancho
 */

/**
 * Cada entrada: { Q (L/s), dh (mm) } por tipo de desagüe.
 * Interpolación lineal entre puntos.
 */
export const DRAINAGE_TABLE = {
  circ_102: {
    label: 'Circular 102 mm (4")',
    data: [
      { Q: 0.0, dh: 0 },
      { Q: 0.5, dh: 15 },
      { Q: 1.0, dh: 40 },
      { Q: 1.5, dh: 70 },
      { Q: 2.0, dh: 105 },
      { Q: 2.5, dh: 145 },
      { Q: 3.0, dh: 190 },
    ],
  },
  circ_152: {
    label: 'Circular 152 mm (6")',
    data: [
      { Q: 0.0, dh: 0 },
      { Q: 1.0, dh: 15 },
      { Q: 2.0, dh: 30 },
      { Q: 3.0, dh: 50 },
      { Q: 5.0, dh: 80 },
      { Q: 7.0, dh: 115 },
      { Q: 10.0, dh: 170 },
    ],
  },
  circ_203: {
    label: 'Circular 203 mm (8")',
    data: [
      { Q: 0.0, dh: 0 },
      { Q: 2.0, dh: 10 },
      { Q: 5.0, dh: 25 },
      { Q: 10.0, dh: 55 },
      { Q: 15.0, dh: 85 },
      { Q: 20.0, dh: 120 },
    ],
  },
  canal_152: {
    label: 'Canal abierto 152 mm',
    data: [
      { Q: 0.0, dh: 0 },
      { Q: 0.5, dh: 20 },
      { Q: 1.0, dh: 50 },
      { Q: 1.5, dh: 80 },
      { Q: 2.0, dh: 115 },
    ],
  },
  canal_610: {
    label: 'Canal abierto 610 mm',
    data: [
      { Q: 0.0, dh: 0 },
      { Q: 2.0, dh: 20 },
      { Q: 5.0, dh: 50 },
      { Q: 10.0, dh: 100 },
      { Q: 15.0, dh: 150 },
    ],
  },
};

/**
 * Interpola dh desde la tabla para un tipo de desagüe y caudal Q.
 * @param {string} drainType - Clave del tipo de desagüe
 * @param {number} Q - Caudal en L/s
 * @returns {number} dh en mm
 */
export function interpDh(drainType, Q) {
  const entry = DRAINAGE_TABLE[drainType];
  if (!entry) return 0;
  const d = entry.data;
  if (Q <= d[0].Q) return d[0].dh;
  if (Q >= d[d.length - 1].Q) return d[d.length - 1].dh;
  for (let i = 0; i < d.length - 1; i++) {
    if (Q >= d[i].Q && Q <= d[i + 1].Q) {
      const t = (Q - d[i].Q) / (d[i + 1].Q - d[i].Q);
      return d[i].dh + t * (d[i + 1].dh - d[i].dh);
    }
  }
  return 0;
}

/**
 * Calcula caudal de lluvia.
 * Q = 0.278 × 10⁻³ × A × i  [L/s]
 * (Ec. C5.1 CIRSOC 101-2025)
 * @param {number} A - Área de cubierta atendida [m²]
 * @param {number} i - Intensidad de lluvia [mm/h]
 * @returns {number} Q en L/s
 */
export function calcQ(A, i) {
  return 0.000278 * A * i;
}
