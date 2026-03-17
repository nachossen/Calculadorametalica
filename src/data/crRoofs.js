/**
 * data/crRoofs.js — GCp para Componentes y Revestimientos: Cubiertas
 * Fig. 5.3-2A a 5.3-2D CIRSOC 102-2025
 *
 * Zonas cubierta:
 *   1 — Interior de cubierta
 *   2 — Borde de cubierta (franja a del borde)
 *   3 — Esquina de cubierta (franja a × a en esquina)
 *
 * Cada sub-figura corresponde a un rango de pendiente θ:
 *   A: θ ≤ 7°  (plano/baja pendiente)
 *   B: 7° < θ ≤ 27°
 *   C: 27° < θ ≤ 45°
 *   D: θ > 45° (pendiente alta)
 *
 * GCp en función del área tributaria efectiva A [m²]
 */

/** Fig. 5.3-2A: θ ≤ 7° */
export const CR_ROOF_A = {
  1: [
    { a: 0.93, pos: 0.3,  neg: -1.0  },
    { a: 4.65, pos: 0.3,  neg: -0.9  },
    { a: 9.29, pos: 0.2,  neg: -0.9  },
    { a: 46.5, pos: 0.2,  neg: -0.8  },
    { a: 92.9, pos: 0.2,  neg: -0.7  },
  ],
  2: [
    { a: 0.93, pos: 0.3,  neg: -1.8  },
    { a: 4.65, pos: 0.3,  neg: -1.5  },
    { a: 9.29, pos: 0.2,  neg: -1.3  },
    { a: 46.5, pos: 0.2,  neg: -1.1  },
    { a: 92.9, pos: 0.2,  neg: -0.8  },
  ],
  3: [
    { a: 0.93, pos: 0.3,  neg: -2.8  },
    { a: 4.65, pos: 0.3,  neg: -2.1  },
    { a: 9.29, pos: 0.2,  neg: -1.7  },
    { a: 46.5, pos: 0.2,  neg: -1.1  },
    { a: 92.9, pos: 0.2,  neg: -0.8  },
  ],
};

/** Fig. 5.3-2B: 7° < θ ≤ 27° */
export const CR_ROOF_B = {
  1: [
    { a: 0.93, pos: 0.5,  neg: -1.0  },
    { a: 4.65, pos: 0.5,  neg: -0.9  },
    { a: 9.29, pos: 0.4,  neg: -0.8  },
    { a: 46.5, pos: 0.3,  neg: -0.7  },
    { a: 92.9, pos: 0.3,  neg: -0.6  },
  ],
  2: [
    { a: 0.93, pos: 0.5,  neg: -1.5  },
    { a: 4.65, pos: 0.5,  neg: -1.3  },
    { a: 9.29, pos: 0.4,  neg: -1.1  },
    { a: 46.5, pos: 0.3,  neg: -0.9  },
    { a: 92.9, pos: 0.3,  neg: -0.8  },
  ],
  3: [
    { a: 0.93, pos: 0.5,  neg: -2.6  },
    { a: 4.65, pos: 0.5,  neg: -2.0  },
    { a: 9.29, pos: 0.4,  neg: -1.6  },
    { a: 46.5, pos: 0.3,  neg: -1.1  },
    { a: 92.9, pos: 0.3,  neg: -0.8  },
  ],
};

/** Fig. 5.3-2C: 27° < θ ≤ 45° */
export const CR_ROOF_C = {
  1: [
    { a: 0.93, pos: 0.9,  neg: -1.0  },
    { a: 4.65, pos: 0.8,  neg: -0.8  },
    { a: 9.29, pos: 0.7,  neg: -0.7  },
    { a: 46.5, pos: 0.6,  neg: -0.6  },
    { a: 92.9, pos: 0.5,  neg: -0.5  },
  ],
  2: [
    { a: 0.93, pos: 0.9,  neg: -1.4  },
    { a: 4.65, pos: 0.8,  neg: -1.2  },
    { a: 9.29, pos: 0.7,  neg: -1.0  },
    { a: 46.5, pos: 0.6,  neg: -0.8  },
    { a: 92.9, pos: 0.5,  neg: -0.7  },
  ],
  3: [
    { a: 0.93, pos: 0.9,  neg: -2.0  },
    { a: 4.65, pos: 0.8,  neg: -1.6  },
    { a: 9.29, pos: 0.7,  neg: -1.3  },
    { a: 46.5, pos: 0.6,  neg: -0.9  },
    { a: 92.9, pos: 0.5,  neg: -0.7  },
  ],
};

/** Fig. 5.3-2D: θ > 45° */
export const CR_ROOF_D = {
  1: [
    { a: 0.93, pos: 1.0,  neg: -1.0  },
    { a: 4.65, pos: 0.9,  neg: -0.8  },
    { a: 9.29, pos: 0.8,  neg: -0.7  },
    { a: 46.5, pos: 0.7,  neg: -0.6  },
    { a: 92.9, pos: 0.6,  neg: -0.5  },
  ],
  2: [
    { a: 0.93, pos: 1.0,  neg: -1.2  },
    { a: 4.65, pos: 0.9,  neg: -1.0  },
    { a: 9.29, pos: 0.8,  neg: -0.9  },
    { a: 46.5, pos: 0.7,  neg: -0.7  },
    { a: 92.9, pos: 0.6,  neg: -0.6  },
  ],
  3: [
    { a: 0.93, pos: 1.0,  neg: -1.6  },
    { a: 4.65, pos: 0.9,  neg: -1.3  },
    { a: 9.29, pos: 0.8,  neg: -1.1  },
    { a: 46.5, pos: 0.7,  neg: -0.8  },
    { a: 92.9, pos: 0.6,  neg: -0.6  },
  ],
};

/**
 * Selecciona la sub-figura según θ (grados).
 * @param {number} thetaDeg — pendiente de cubierta en grados
 * @returns {Object} sub-figura con zonas 1,2,3
 */
export function getCrRoofFig(thetaDeg) {
  if (thetaDeg <= 7)  return CR_ROOF_A;
  if (thetaDeg <= 27) return CR_ROOF_B;
  if (thetaDeg <= 45) return CR_ROOF_C;
  return CR_ROOF_D;
}

/** Descripción de cada zona de cubierta */
export const CR_ROOF_ZONE_DESC = {
  1: 'Cubierta interior',
  2: 'Cubierta borde (franja a)',
  3: 'Cubierta esquina (a × a)',
};
