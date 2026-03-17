/**
 * methods/comparador.js — Comparación detallada Direccional vs Envolvente
 */

/**
 * Compara presiones por superficie entre los dos métodos.
 * @param {Object} dir — resultado de runDireccional
 * @param {Object} env — resultado de runEnvolvente
 * @returns {Object}
 */
export function compareResults(dir, env) {
  if (!env.isApplicable) {
    return { applicable: false, recommendation: 'Envolvente no aplicable (h > 20m)' };
  }

  // Direccional — max absolute per surface
  const dirMaxWall = Math.max(
    Math.abs(dir.pWW.max), Math.abs(dir.pWW.min),
    Math.abs(dir.pLW.max), Math.abs(dir.pLW.min),
  );
  const dirMaxRoof = Math.max(
    Math.abs(dir.pRBVmax.max), Math.abs(dir.pRBVmax.min),
    Math.abs(dir.pRBVmin.max), Math.abs(dir.pRBVmin.min),
    Math.abs(dir.pRSV.max), Math.abs(dir.pRSV.min),
  );
  const envMaxWall = Math.max(env.envMax.wallBV, env.envMax.wallSV);
  const envMaxRoof = Math.max(env.envMax.roofBV, env.envMax.roofSV);

  const dirTotal = dirMaxWall + dirMaxRoof;
  const envTotal = envMaxWall + envMaxRoof;
  const cheaper = envTotal < dirTotal ? 'Envolvente' : 'Direccional';
  const savings = Math.abs(1 - envTotal / dirTotal) * 100;

  // Detailed per-surface breakdown
  const surfaces = [
    {
      name: 'Barlovento',
      dirMax: Math.max(Math.abs(dir.pWW.max), Math.abs(dir.pWW.min)),
      dirP: dir.pWW.max, dirN: dir.pWW.min,
      envMax: env.envMax.wallBV,
      envZone: '1/1E',
    },
    {
      name: 'Sotavento',
      dirMax: Math.max(Math.abs(dir.pLW.max), Math.abs(dir.pLW.min)),
      dirP: dir.pLW.max, dirN: dir.pLW.min,
      envMax: env.envMax.wallSV,
      envZone: '4',
    },
    {
      name: 'Lateral',
      dirMax: Math.max(Math.abs(dir.pLat.max), Math.abs(dir.pLat.min)),
      dirP: dir.pLat.max, dirN: dir.pLat.min,
      envMax: null,
      envZone: '—',
    },
    {
      name: 'Cub. BV (Cp max)',
      dirMax: Math.max(Math.abs(dir.pRBVmax.max), Math.abs(dir.pRBVmax.min)),
      dirP: dir.pRBVmax.max, dirN: dir.pRBVmax.min,
      envMax: env.envMax.roofBV,
      envZone: '2/2E',
    },
    {
      name: 'Cub. BV (Cp min)',
      dirMax: Math.max(Math.abs(dir.pRBVmin.max), Math.abs(dir.pRBVmin.min)),
      dirP: dir.pRBVmin.max, dirN: dir.pRBVmin.min,
      envMax: null,
      envZone: '—',
    },
    {
      name: 'Cub. SV',
      dirMax: Math.max(Math.abs(dir.pRSV.max), Math.abs(dir.pRSV.min)),
      dirP: dir.pRSV.max, dirN: dir.pRSV.min,
      envMax: env.envMax.roofSV,
      envZone: '3/3E',
    },
  ];

  // Compute delta% for surfaces with both methods
  surfaces.forEach(s => {
    if (s.envMax != null && s.dirMax > 0) {
      s.delta = ((s.envMax - s.dirMax) / s.dirMax * 100).toFixed(1);
    } else {
      s.delta = null;
    }
  });

  return {
    applicable: true, cheaper,
    savings: savings.toFixed(1),
    dirMaxWall, dirMaxRoof, envMaxWall, envMaxRoof,
    surfaces,
    recommendation: `${cheaper} da ~${savings.toFixed(0)}% ${envTotal < dirTotal ? 'menos' : 'más'} carga`,
  };
}
