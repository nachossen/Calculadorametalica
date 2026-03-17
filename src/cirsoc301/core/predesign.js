/**
 * predesign.js — Algoritmo de predimensionado automático
 *
 * Selecciona el perfil W más liviano que cumple todas las verificaciones
 * CIRSOC 301-2018 para columnas y rafters del pórtico a dos aguas.
 *
 * Incluye:
 * - Peso propio iterativo (converge en 1-2 iteraciones)
 * - Verificación H1 con pares (N,M) por combinación (no envolvente independiente)
 * - Tracking de combinación dominante
 */

import { PERFILES_W, Fy, E } from '../data/perfilesW.js';
import { createPorticoModel, solveFrame, envelopeForces, serviceDeflections } from './frameSolver.js';
import { generateAllCombinations, generateServiceLoads, generateSelfWeightLoads, generateServiceCombinations, generateBasicCases } from './loadCases.js';
import { verificarPerfil, verificarFlecha } from './steelDesign.js';

// Perfiles ordenados por peso (de menor a mayor)
const perfilesOrdenados = [...PERFILES_W].sort((a, b) => a.peso - b.peso);

/**
 * Estima el Zx requerido para una primera aproximación del perfil.
 */
function estimarZxReq(Mu) {
  return Math.abs(Mu) * 1e3 / (0.9 * Fy);
}

/**
 * Filtra perfiles candidatos a partir de un Zx mínimo.
 */
function candidatos(ZxMin) {
  return perfilesOrdenados.filter(p => p.Zx >= ZxMin * 0.7);
}

/**
 * Busca el perfil más liviano que pasa la verificación con los esfuerzos dados.
 */
function buscarPerfil(solicitaciones, params, ZxMin) {
  const cands = candidatos(ZxMin);
  for (const perfil of cands) {
    const ver = verificarPerfil(perfil, solicitaciones, params);
    if (ver.pasa) return { perfil, ver };
  }
  // Si ninguno pasa, usar el más pesado
  const perfil = perfilesOrdenados[perfilesOrdenados.length - 1];
  const ver = verificarPerfil(perfil, solicitaciones, params);
  return { perfil, ver };
}

/**
 * Verificación H1 por combinación: evalúa cada combo individualmente
 * distinguiendo el signo de M para usar el Lb correcto (ala comprimida).
 *
 * @param {Object} perfil
 * @param {Array} resultsFinal - resultados de solveFrame con id/nombre
 * @param {number[]} elemIndices - índices de elementos a verificar (ej: [0,3] para columnas)
 * @param {Object} paramsPos - params cuando M > 0 (ala "positiva" comprimida, Lb = ala arriostrada)
 * @param {Object} paramsNeg - params cuando M < 0 (ala "negativa" comprimida, Lb = ala libre)
 * @returns {{ ver, comboDominante, comboId, allCombos }}
 */
function verificarPerfilAllCombos(perfil, resultsFinal, elemIndices, paramsPos, paramsNeg) {
  let worstRatio = 0;
  let worstVer = null;
  let worstComboId = '';
  let worstComboNombre = '';
  const allCombos = [];

  for (const r of resultsFinal) {
    // Rastrear N, V máximos y M por signo (máx sagging y máx |hogging|)
    let N = 0, V = 0, M_pos = 0, M_neg = 0;
    for (const idx of elemIndices) {
      const ef = r.elementForces[idx];
      if (!ef) continue;
      const n = Math.max(Math.abs(ef.Ni), Math.abs(ef.Nj));
      const v = Math.max(Math.abs(ef.Vi), Math.abs(ef.Vj));
      if (n > N) N = n;
      if (v > V) V = v;
      for (const mv of [ef.Mi, ef.Mj]) {
        if (mv > M_pos) M_pos = mv;
        if (-mv > M_neg) M_neg = -mv;
      }
    }

    // Verificar con Lb para cada signo, tomar el peor H1
    const verPos = M_pos > 1e-6 ? verificarPerfil(perfil, { N, V, M: M_pos }, paramsPos) : null;
    const verNeg = M_neg > 1e-6 ? verificarPerfil(perfil, { N, V, M: M_neg }, paramsNeg) : null;
    const ver = (!verPos || (verNeg && verNeg.ratioH1 > verPos.ratioH1)) ? verNeg : verPos;
    const M = ver === verPos ? M_pos : M_neg;
    const Lb_usado = ver === verPos ? paramsPos.Lb : paramsNeg.Lb;

    allCombos.push({
      id: r.id,
      nombre: r.nombre,
      N, V, M,
      Lb_usado,
      ratioH1: ver?.ratioH1 ?? 0,
      formulaH1: ver?.formulaH1 ?? '—',
      ratioCorte: ver?.ratioCorte ?? 0,
      pasa: ver?.pasa ?? false,
    });

    if ((ver?.ratioH1 ?? 0) > worstRatio) {
      worstRatio = ver.ratioH1;
      worstVer = ver;
      worstComboId = r.id;
      worstComboNombre = r.nombre;
    }
  }

  return {
    ver: worstVer,
    comboDominante: worstComboNombre,
    comboId: worstComboId,
    allCombos,
  };
}

/**
 * Predimensiona el pórtico completo.
 *
 * @param {Object} geo - { B, L, he, hc, nPorticos, sepCorreas, tipoBase }
 * @param {Object} cargas - { D, Lr, W_barlovento_col, ..., W2_col, W2_raf } [kN/m²]
 * @returns {Object} resultado del predimensionado
 */
export function predimensionar(geo, cargas, overrides = {}) {
  const { B, he, hc, tipoBase, sepCorreas, rotula, arriostCol, arriostColCustom,
          arriostRafterInf = 'ninguno', arriostRafterInfCustom } = geo;
  const sepGirts = (geo.sepGirts && geo.sepGirts > 0) ? geo.sepGirts : 2.0;

  const sep = geo.L / (geo.nPorticos - 1);
  const theta = Math.atan2(hc - he, B / 2);
  const Lrafter = Math.sqrt((B / 2) ** 2 + (hc - he) ** 2);
  const Lcolumna = he;

  // ── K factor eje fuerte (plano del pórtico) ──
  let Kcol_default;
  if (tipoBase === 'empotrada') Kcol_default = rotula ? 1.2 : 0.80;
  else                          Kcol_default = 1.0;
  const Kcol = geo.Kx_col != null ? geo.Kx_col : Kcol_default;
  const KLx_col = Kcol * Lcolumna;

  // ── Longitud de pandeo eje débil (perpendicular al pórtico) ──
  let Ly_col;
  switch (arriostCol) {
    case 'mitad':   Ly_col = Lcolumna / 2; break;
    case 'tercios': Ly_col = Lcolumna / 3; break;
    case 'custom':  Ly_col = (arriostColCustom > 0 ? arriostColCustom : Lcolumna); break;
    default:        Ly_col = Lcolumna; break; // 'ninguno' — sin puntal interior
  }
  const KLy_col = 1.0 * Ly_col;
  const Lb_columna = Ly_col;

  const KLx_raf = 1.0 * Lrafter;
  const KLy_raf = sepCorreas;

  // ── Lb rafter — ala superior (arriostrada por correas) vs. inferior (tornapuntas) ──
  const Lb_rafter_sup = sepCorreas;  // M > 0: ala sup comprimida (gravedad)
  let Lb_rafter_inf;
  switch (arriostRafterInf) {
    case 'mitad':   Lb_rafter_inf = Lrafter / 2; break;
    case 'tercios': Lb_rafter_inf = Lrafter / 3; break;
    case 'custom':  Lb_rafter_inf = (arriostRafterInfCustom > 0 ? arriostRafterInfCustom : Lrafter); break;
    default:        Lb_rafter_inf = Lrafter; break;  // 'ninguno'
  }

  // ── Lb columna — ala exterior (girts) vs. ala interior (girts+tornapuntas=arriostCol) ──
  const Lb_col_ext = sepGirts;   // M que comprime ala exterior: arriostrada por girts
  const Lb_col_int = Lb_columna; // M que comprime ala interior: controlada por arriostCol

  // Params por signo de M (para verificación sign-aware)
  const paramsColPos = { KLx: KLx_col, KLy: KLy_col, Lb: Lb_col_ext, Fy, E };
  const paramsColNeg = { KLx: KLx_col, KLy: KLy_col, Lb: Lb_col_int, Fy, E };
  const paramsRafPos = { KLx: KLx_raf, KLy: KLy_raf, Lb: Lb_rafter_sup, Fy, E };
  const paramsRafNeg = { KLx: KLx_raf, KLy: KLy_raf, Lb: Lb_rafter_inf, Fy, E };

  // Legacy (para buscarPerfil — usa el Lb más conservador de cada elemento)
  const paramsCol = { KLx: KLx_col, KLy: KLy_col, Lb: Math.max(Lb_col_ext, Lb_col_int), Fy, E };
  const paramsRaf = { KLx: KLx_raf, KLy: KLy_raf, Lb: Math.max(Lb_rafter_sup, Lb_rafter_inf), Fy, E };

  // Índices de elementos: columnas=[0,3], rafters=[1,2]
  const colElems = [0, 3];
  const rafElems = [1, 2];

  // ─── Iteración con peso propio ───
  // 1. Primera pasada sin peso propio para estimar perfiles
  // 2. Agregar peso propio y re-verificar (máx 2 iteraciones)

  const perfilInicial = perfilesOrdenados.find(p => p.Zx >= 300) || perfilesOrdenados[perfilesOrdenados.length - 1];

  const modelInit = createPorticoModel(
    { B, he, hc, tipoBase, rotula },
    { columna: perfilInicial, rafter: perfilInicial },
    E,
  );

  // Primera corrida sin peso propio
  const combosInit = generateAllCombinations({ sep, theta, cargas });
  const resultsInit = combosInit.map(c => solveFrame(modelInit, c.loads));
  const envInit = envelopeForces(resultsInit);

  // Selección inicial de perfiles
  let perfilColumna = buscarPerfil(
    { N: envInit.columna.Nmax, V: envInit.columna.Vmax, M: envInit.columna.Mmax },
    paramsCol, estimarZxReq(envInit.columna.Mmax),
  ).perfil;

  let perfilRafter = buscarPerfil(
    { N: envInit.rafter.Nmax, V: envInit.rafter.Vmax, M: envInit.rafter.Mmax },
    paramsRaf, estimarZxReq(envInit.rafter.Mmax),
  ).perfil;

  // Aplicar overrides del usuario (si los hay)
  const { colId, rafId } = overrides;
  if (colId) { const ov = perfilesOrdenados.find(p => p.id === colId); if (ov) perfilColumna = ov; }
  if (rafId) { const ov = perfilesOrdenados.find(p => p.id === rafId); if (ov) perfilRafter = ov; }

  // ─── Iteración con peso propio (máx 2 vueltas) ───
  let combos, resultsFinal, envFinal;

  for (let iter = 0; iter < 2; iter++) {
    const selfWeightLoads = generateSelfWeightLoads(theta, perfilColumna, perfilRafter);

    combos = generateAllCombinations({ sep, theta, cargas, selfWeightLoads });

    const model = createPorticoModel(
      { B, he, hc, tipoBase, rotula },
      { columna: perfilColumna, rafter: perfilRafter },
      E,
    );

    resultsFinal = combos.map(c => ({
      ...solveFrame(model, c.loads),
      id: c.id,
      nombre: c.nombre,
    }));
    envFinal = envelopeForces(resultsFinal);

    // Verificar H1 por combinación (sign-aware: Lb distinto por signo de M)
    const verCol = verificarPerfilAllCombos(perfilColumna, resultsFinal, colElems, paramsColPos, paramsColNeg);
    const verRaf = verificarPerfilAllCombos(perfilRafter, resultsFinal, rafElems, paramsRafPos, paramsRafNeg);

    if (verCol.ver?.pasa && verRaf.ver?.pasa) break;

    // Si no pasa, buscar perfil más grande
    const prevCol = perfilColumna;
    const prevRaf = perfilRafter;

    if (!verCol.ver?.pasa && !colId) {
      perfilColumna = buscarPerfil(
        { N: envFinal.columna.Nmax, V: envFinal.columna.Vmax, M: envFinal.columna.Mmax },
        paramsCol, estimarZxReq(envFinal.columna.Mmax),
      ).perfil;
    }
    if (!verRaf.ver?.pasa && !rafId) {
      perfilRafter = buscarPerfil(
        { N: envFinal.rafter.Nmax, V: envFinal.rafter.Vmax, M: envFinal.rafter.Mmax },
        paramsRaf, estimarZxReq(envFinal.rafter.Mmax),
      ).perfil;
    }

    // Si los perfiles no cambiaron, no tiene sentido iterar más
    if (perfilColumna === prevCol && perfilRafter === prevRaf) break;
  }

  // ─── Resultados finales con verificación H1 por combinación ───
  const modelFinal = createPorticoModel(
    { B, he, hc, tipoBase, rotula },
    { columna: perfilColumna, rafter: perfilRafter },
    E,
  );

  // Re-resolver con perfiles finales y peso propio actualizado
  const selfWeightFinal = generateSelfWeightLoads(theta, perfilColumna, perfilRafter);
  const combosFinal = generateAllCombinations({ sep, theta, cargas, selfWeightLoads: selfWeightFinal });

  resultsFinal = combosFinal.map(c => ({
    ...solveFrame(modelFinal, c.loads),
    id: c.id,
    nombre: c.nombre,
    loads: c.loads,
  }));
  envFinal = envelopeForces(resultsFinal);

  // Verificación H1 por combinación (resultado definitivo, sign-aware)
  const verColResult = verificarPerfilAllCombos(perfilColumna, resultsFinal, colElems, paramsColPos, paramsColNeg);
  const verRafResult = verificarPerfilAllCombos(perfilRafter, resultsFinal, rafElems, paramsRafPos, paramsRafNeg);

  const verColumna = {
    ...verColResult.ver,
    comboDominante: verColResult.comboDominante,
    comboId: verColResult.comboId,
    allCombos: verColResult.allCombos,
    Lp: verColResult.ver?.detalles?.mn?.Lp,
    Lr: verColResult.ver?.detalles?.mn?.Lr,
  };
  const verRafter = {
    ...verRafResult.ver,
    comboDominante: verRafResult.comboDominante,
    comboId: verRafResult.comboId,
    allCombos: verRafResult.allCombos,
    Lp: verRafResult.ver?.detalles?.mn?.Lp,
    Lr: verRafResult.ver?.detalles?.mn?.Lr,
  };

  // ─── Verificación de flecha con cargas de servicio ───
  const servLoads = generateServiceLoads({ sep, theta, cargas });
  const resultServ = solveFrame(modelFinal, servLoads.DplusLr);
  const resultServW = solveFrame(modelFinal, servLoads.W);
  const deflDpLr = serviceDeflections(modelFinal, resultServ);
  const deflW = serviceDeflections(modelFinal, resultServW);

  const flechaCheck = verificarFlecha(
    {
      columna: { deltaH: deflW.columna.deltaH },
      rafter: { deltaV: deflDpLr.rafter.deltaV },
    },
    he,
    Lrafter,
  );

  // ─── Combinación más desfavorable (para diagramas) ───
  let peorCombo = resultsFinal[0];
  let maxM = 0;
  for (const r of resultsFinal) {
    for (const ef of r.elementForces) {
      const m = Math.max(Math.abs(ef.Mi), Math.abs(ef.Mj));
      if (m > maxM) { maxM = m; peorCombo = r; }
    }
  }

  // Peso propio del pórtico
  const pesoPropioPorPorK = 2 * (perfilColumna.peso * Lcolumna + perfilRafter.peso * Lrafter);

  // ─── Combos de visualización (ELS y Básicos) — no afectan diseño ───
  // Se resuelven con el modelo final y se agregan a combinaciones para TabDiagramas.
  const visCombos = [
    ...generateServiceCombinations({ sep, theta, cargas, selfWeightLoads: selfWeightFinal }),
    ...generateBasicCases({ sep, theta, cargas, selfWeightLoads: selfWeightFinal }),
  ];
  const visResults = visCombos.map(c => ({
    ...solveFrame(modelFinal, c.loads),
    id: c.id, nombre: c.nombre, group: c.group, loads: c.loads,
  }));
  const allCombinations = [
    ...resultsFinal.map(r => ({ ...r, group: r.group || 'elu' })),
    ...visResults,
  ];

  return {
    perfilColumna,
    perfilRafter,
    verColumna,
    verRafter,
    flechaCheck,
    envolvente: envFinal,
    peorCombo,
    combinaciones: allCombinations,
    parametros: {
      sep, theta: theta * 180 / Math.PI, Lrafter, Lcolumna,
      KLx_col, KLy_col, KLx_raf, KLy_raf,
      // Lb por ala (sign-aware)
      Lb_rafter_sup, Lb_rafter_inf,
      Lb_col_ext, Lb_col_int,
      // Legacy (compat)
      Lb_rafter: Lb_rafter_sup, Lb_columna,
      sepGirts, Kcol, Kcol_default, rotula: !!rotula, Ly_col,
      arriostCol: arriostCol || 'sepGirts',
      arriostRafterInf,
    },
    pesoPropio: {
      porPortico: pesoPropioPorPorK,  // [kg]
      columna: perfilColumna.peso,     // [kg/m]
      rafter: perfilRafter.peso,       // [kg/m]
    },
  };
}
