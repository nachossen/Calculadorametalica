/**
 * methods/staadExport.js — Generación de código STAAD Pro para cargas de viento
 * Sin IDs de miembros: el usuario los asigna manualmente
 * Paredes → UNI GX (global X); Cubiertas → UNI LOCAL Y (perpendicular al faldón)
 */

/**
 * Genera load cases STAAD para el método Direccional.
 * 4 load cases: 0°, 90°, 180°, 270° (con signos GCpi+ y GCpi-)
 * @param {Object} r — resultado de runDireccional
 * @returns {string} código STAAD
 */
export function generateStaadDireccional(r) {
  const ff = r.frameForces;
  const lines = [];

  lines.push('*===========================================================');
  lines.push('* CARGAS DE VIENTO — MÉTODO DIRECCIONAL (Cap. 2, CIRSOC 102-2025)');
  lines.push(`* V = ${r.V} m/s | Exp. ${r.exp} | qh = ${r.qh.toFixed(2)} Pa`);
  lines.push(`* G = ${r.G.toFixed(4)} | GCpi = ±${r.gcpi.p}`);
  lines.push(`* Sep. pórticos = ${ff.sep.toFixed(2)} m`);
  lines.push('* Valores en kN/m (carga distribuida sobre pórtico típico)');
  lines.push('* NOTA: Asignar IDs de miembros en cada línea UNI');
  lines.push('*===========================================================');
  lines.push('');

  // Load case con GCpi+ (max presión en superficies externas)
  lines.push(`LOAD 1 LOADTYPE Wind TITLE VIENTO ${r.windAngle}° - GCpi+`);
  lines.push('MEMBER LOAD');
  addWallLoads(lines, r, ff, 'max');
  addRoofLoads(lines, r, ff, 'max');
  lines.push('');

  // Load case con GCpi- (max succión)
  lines.push(`LOAD 2 LOADTYPE Wind TITLE VIENTO ${r.windAngle}° - GCpi-`);
  lines.push('MEMBER LOAD');
  addWallLoads(lines, r, ff, 'min');
  addRoofLoads(lines, r, ff, 'min');
  lines.push('');

  return lines.join('\n');
}

function addWallLoads(lines, r, ff, sign) {
  const pWW = sign === 'max' ? r.pWW.max : r.pWW.min;
  const pLW = sign === 'max' ? r.pLW.max : r.pLW.min;
  const wWW = sign === 'max' ? ff.w_ww_max : ff.w_ww_min;
  const wLW = sign === 'max' ? ff.w_lw_max : ff.w_lw_min;

  lines.push(`*--- Pared barlovento (${r.wl.ww}): p = ${pWW.toFixed(1)} Pa → w = ${wWW.toFixed(3)} kN/m`);
  lines.push(`UNI GX  ${wWW.toFixed(3)}`);
  lines.push(`*--- Pared sotavento (${r.wl.lw}): p = ${pLW.toFixed(1)} Pa → w = ${wLW.toFixed(3)} kN/m`);
  lines.push(`UNI GX  ${wLW.toFixed(3)}`);
}

function addRoofLoads(lines, r, ff, sign) {
  const pRBV = sign === 'max' ? r.pRBVmax.max : r.pRBVmin.min;
  const wRBV = sign === 'max' ? ff.w_rbv_max : ff.w_rbv_min;
  const pRSV = sign === 'max' ? r.pRSV.max : r.pRSV.min;
  const wRSV = sign === 'max' ? ff.w_rsv_max : ff.w_rsv_min;

  lines.push(`*--- Cubierta BV: p = ${pRBV.toFixed(1)} Pa → w = ${wRBV.toFixed(3)} kN/m`);
  lines.push(`UNI LOCAL Y  ${wRBV.toFixed(3)}`);
  if (!r.is1agua) {
    lines.push(`*--- Cubierta SV: p = ${pRSV.toFixed(1)} Pa → w = ${wRSV.toFixed(3)} kN/m`);
    lines.push(`UNI LOCAL Y  ${wRSV.toFixed(3)}`);
  }
}

/**
 * Genera load cases STAAD para el método Envolvente.
 * 8 load cases: 4 casos × 2 signos GCpi
 * @param {Object} envR — resultado de runEnvolvente
 * @returns {string} código STAAD
 */
export function generateStaadEnvolvente(envR) {
  if (!envR.isApplicable) return '* MÉTODO ENVOLVENTE NO APLICABLE (h > 20 m)';

  const lines = [];
  lines.push('*===========================================================');
  lines.push('* CARGAS DE VIENTO — MÉTODO ENVOLVENTE (Ap. C, CIRSOC 102-2025)');
  lines.push(`* qh = ${envR.qh.toFixed(2)} Pa | GCpi = ±${envR.gcpi.p}`);
  lines.push(`* θ = ${envR.theta.toFixed(1)}° | a = ${envR.a.toFixed(2)} m`);
  lines.push('* Valores en kN/m² (presiones por zona, no multiplicadas por sep.)');
  lines.push('* NOTA: Asignar IDs de miembros/placas en cada línea');
  lines.push('*===========================================================');
  lines.push('');

  const casoNames = ['Transversal', 'Longitudinal', 'Torsional Trans.', 'Torsional Long.'];
  const casoData = [envR.c1, envR.c2, envR.c3, envR.c4];

  let loadN = 1;
  for (let ci = 0; ci < 4; ci++) {
    const data = casoData[ci];
    const zones = Object.keys(data);

    // p+ (GCpi negativo → mayor presión)
    lines.push(`LOAD ${loadN} LOADTYPE Wind TITLE ENV Caso ${ci + 1} - ${casoNames[ci]} - GCpi+`);
    lines.push('MEMBER LOAD');
    for (const z of zones) {
      const d = data[z];
      const isWall = z === '1' || z === '4' || z === '5' || z === '1E' || z === '4E' || z === '5E' ||
                     z === '1T' || z === '4T' || z === '5T';
      const dir = isWall ? 'UNI GX' : 'UNI LOCAL Y';
      lines.push(`*--- Zona ${z}: GCpf = ${d.gcpf >= 0 ? '+' : ''}${d.gcpf.toFixed(2)} → p+ = ${d.pPos.toFixed(1)} Pa`);
      lines.push(`${dir}  ${(d.pPos / 1000).toFixed(4)}`);
    }
    lines.push('');
    loadN++;

    // p- (GCpi positivo → mayor succión)
    lines.push(`LOAD ${loadN} LOADTYPE Wind TITLE ENV Caso ${ci + 1} - ${casoNames[ci]} - GCpi-`);
    lines.push('MEMBER LOAD');
    for (const z of zones) {
      const d = data[z];
      const isWall = z === '1' || z === '4' || z === '5' || z === '1E' || z === '4E' || z === '5E' ||
                     z === '1T' || z === '4T' || z === '5T';
      const dir = isWall ? 'UNI GX' : 'UNI LOCAL Y';
      lines.push(`*--- Zona ${z}: GCpf = ${d.gcpf >= 0 ? '+' : ''}${d.gcpf.toFixed(2)} → p- = ${d.pNeg.toFixed(1)} Pa`);
      lines.push(`${dir}  ${(d.pNeg / 1000).toFixed(4)}`);
    }
    lines.push('');
    loadN++;
  }

  return lines.join('\n');
}
