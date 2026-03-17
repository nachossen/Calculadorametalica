/**
 * core/enclosure.js — Clasificación de cerramiento según CIRSOC 102-2025
 * Sec. 1.11 / Tabla 1.11-1
 *
 * 4 categorías: Abierto, Parcialmente Abierto, Parcialmente Cerrado, Cerrado
 */

/**
 * Clasifica el cerramiento según las aberturas de cada pared.
 * Retorna la clasificación y los datos de verificación por pared.
 *
 * @param {Array<{ao: number, ag: number}>} walls — ao=área abertura, ag=área bruta pared
 * @returns {{ classification: string, details: Object[] }}
 */
export function classifyEnclosureDetailed(walls) {
  const tO = walls.reduce((s, w) => s + w.ao, 0);
  const tG = walls.reduce((s, w) => s + w.ag, 0);

  const details = walls.map((w, i) => {
    const Aoi = tO - w.ao;
    const Agi = tG - w.ag;
    const ratio = w.ag > 0 ? w.ao / w.ag : 0;
    return { idx: i, Ao: w.ao, Ag: w.ag, Aoi, Agi, ratio };
  });

  // 1. Abierto: al menos una pared tiene Ao ≥ 80% de Ag
  const hasOpenWall = walls.some(w => w.ag > 0 && w.ao / w.ag >= 0.8);
  if (hasOpenWall) {
    // Y las demás cumplen: Ao/Ag ≤ 20% (criterio simplificado)
    const othersClosed = walls.filter(w => w.ag > 0 && w.ao / w.ag < 0.8)
      .every(w => w.ao / w.ag <= 0.20);
    if (othersClosed) {
      return { classification: 'Abierto', details };
    }
  }

  // 2. Parcialmente Abierto: una pared tiene Ao > Aoi total de las demás
  //    pero no llega a 80% para ser Abierto
  for (const d of details) {
    const Aoi = d.Aoi;
    if (d.Ao > 1.1 * Aoi && d.Ag > 0 && d.Ao / d.Ag < 0.8) {
      if (d.Ao > 0.4 || (d.Agi > 0 && d.Ao > 0.01 * d.Agi)) {
        return { classification: 'Parcialmente Abierto', details };
      }
    }
  }

  // 3. Parcialmente Cerrado: Ao > 1.1×Aoi en alguna pared Y (Ao > 0.4m² o Ao > 0.01×Agi)
  for (const d of details) {
    if (d.Ao > 1.1 * d.Aoi && (d.Ao > 0.4 || (d.Agi > 0 && d.Ao > 0.01 * d.Agi))) {
      return { classification: 'Parcialmente Cerrado', details };
    }
  }

  // 4. Cerrado: no cumple ninguna de las anteriores
  return { classification: 'Cerrado', details };
}

/**
 * Clasificación simplificada (compatibilidad retroactiva).
 * @param {Array<{ao: number, ag: number}>} walls
 * @returns {string}
 */
export function classifyEnclosure(walls) {
  return classifyEnclosureDetailed(walls).classification;
}
