/**
 * data/crWalls.js — GCp para Componentes y Revestimientos: Paredes
 * Fig. 5.3-1 CIRSOC 102-2025
 *
 * Zonas:
 *   4 — Pared general (interior)
 *   5 — Pared borde (franja de ancho a)
 *
 * GCp en función del área tributaria efectiva A [m²]
 * Curvas digitizadas: puntos {a, pos, neg} donde:
 *   a   = área tributaria [m²]
 *   pos = GCp positivo (presión)
 *   neg = GCp negativo (succión)
 */

/** Zona 4 — Pared general */
export const CR_WALL_Z4 = [
  { a: 0.93, pos: 1.0,  neg: -1.1  },
  { a: 1.86, pos: 1.0,  neg: -1.1  },
  { a: 4.65, pos: 0.9,  neg: -1.0  },
  { a: 9.29, pos: 0.85, neg: -0.95 },
  { a: 46.5, pos: 0.75, neg: -0.85 },
  { a: 92.9, pos: 0.7,  neg: -0.8  },
  { a: 465,  pos: 0.7,  neg: -0.7  },
];

/** Zona 5 — Pared borde */
export const CR_WALL_Z5 = [
  { a: 0.93, pos: 1.0,  neg: -1.4  },
  { a: 1.86, pos: 1.0,  neg: -1.4  },
  { a: 4.65, pos: 0.9,  neg: -1.2  },
  { a: 9.29, pos: 0.85, neg: -1.1  },
  { a: 46.5, pos: 0.75, neg: -0.9  },
  { a: 92.9, pos: 0.7,  neg: -0.8  },
  { a: 465,  pos: 0.7,  neg: -0.7  },
];

/** Todas las zonas de pared indexadas */
export const CR_WALL_ZONES = { 4: CR_WALL_Z4, 5: CR_WALL_Z5 };

/** Descripción de cada zona */
export const CR_WALL_ZONE_DESC = {
  4: 'Pared general (interior)',
  5: 'Pared borde (franja a)',
};
