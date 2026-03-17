/**
 * steelDesign.js — Verificaciones CIRSOC 301-2018 / AISC 360
 *
 * Verificaciones simplificadas para predimensionado:
 * - Interacción flexo-compresión H1-1
 * - Pandeo por flexión (Art. E3) → φPn
 * - Pandeo lateral-torsional (Art. F2) → φMn
 * - Corte (Art. G2) → φVn
 * - Flecha de servicio
 */

const phi_c = 0.90; // factor de resistencia compresión
const phi_b = 0.90; // factor de resistencia flexión
const phi_v = 0.90; // factor de resistencia corte

// ─── Pandeo por flexión — φPn (Art. E3) ──────────────────────────────

/**
 * Resistencia nominal a compresión por pandeo por flexión.
 *
 * @param {Object} perfil - Perfil W con propiedades
 * @param {number} KL     - Longitud efectiva K×L [m]
 * @param {string} eje    - 'x' | 'y' (eje de pandeo)
 * @param {number} Fy     - Tensión de fluencia [MPa]
 * @param {number} E      - Módulo de elasticidad [MPa]
 * @returns {{ Pn, phiPn, Fe, Fcr, KLr }}
 */
export function compresionPn(perfil, KL, eje, Fy, E) {
  const r = eje === 'x' ? perfil.rx : perfil.ry; // [cm]
  const KL_cm = KL * 100; // m → cm
  const KLr = KL_cm / r;

  // Tensión crítica de Euler
  const Fe = Math.PI * Math.PI * E / (KLr * KLr);

  let Fcr;
  if (KLr <= 4.71 * Math.sqrt(E / Fy)) {
    // Pandeo inelástico
    Fcr = Math.pow(0.658, Fy / Fe) * Fy;
  } else {
    // Pandeo elástico
    Fcr = 0.877 * Fe;
  }

  const Ag = perfil.A; // [cm²]
  const Pn = Fcr * Ag / 10; // [kN] (MPa × cm² = N×10⁻¹ → /10 para kN)
  const phiPn = phi_c * Pn;

  return { Pn, phiPn, Fe, Fcr, KLr };
}

// ─── Pandeo lateral-torsional — φMn (Art. F2) ────────────────────────

/**
 * Resistencia nominal a flexión considerando pandeo lateral-torsional.
 *
 * @param {Object} perfil - Perfil W
 * @param {number} Lb     - Longitud sin arriostramiento lateral [m]
 * @param {number} Fy     - Tensión de fluencia [MPa]
 * @param {number} E      - Módulo de elasticidad [MPa]
 * @returns {{ Mn, phiMn, Lp, Lr, zona }}
 */
export function flexionMn(perfil, Lb, Fy, E) {
  const { Iy, Sy, Zx, Sx, J, Cw, ry } = perfil;
  const Lb_cm = Lb * 100; // m → cm

  // Momento plástico
  const Mp = Fy * Zx / 1e3; // [kN·m] (MPa × cm³ × 1e3 mm³/cm³ / 1e6 → kN·m)

  // Lp: longitud límite para plastificación completa
  const ry_cm = ry; // ya en cm
  const Lp = 1.76 * ry_cm * Math.sqrt(E / Fy); // [cm]

  // Lr: longitud límite para pandeo elástico
  // Lr = 1.95 * rts * (E/(0.7*Fy)) * sqrt( J*c/(Sx*ho) + sqrt((J*c/(Sx*ho))² + 6.76*(0.7*Fy/E)²) )
  // Simplificación: usar rts ≈ sqrt(sqrt(Iy*Cw)/Sx)
  const rts = Math.sqrt(Math.sqrt(Iy * Cw) / Sx); // [cm]
  const ho = perfil.d / 10 - perfil.tf / 10; // [cm] distancia entre centros de alas (aprox d - tf)
  const c = 1.0; // para secciones doblemente simétricas

  const JcSxho = J * c / (Sx * ho);
  const ratio07 = 0.7 * Fy / E;

  const Lr = 1.95 * rts * (E / (0.7 * Fy)) *
    Math.sqrt(JcSxho + Math.sqrt(JcSxho * JcSxho + 6.76 * ratio07 * ratio07)); // [cm]

  let Mn;
  let zona;

  if (Lb_cm <= Lp) {
    // Zona 1: Plastificación completa
    Mn = Mp;
    zona = 'plástica';
  } else if (Lb_cm <= Lr) {
    // Zona 2: Pandeo inelástico
    const Cb = 1.0; // conservador
    Mn = Cb * (Mp - (Mp - 0.7 * Fy * Sx / 1e3) * (Lb_cm - Lp) / (Lr - Lp));
    Mn = Math.min(Mn, Mp);
    zona = 'inelástica';
  } else {
    // Zona 3: Pandeo elástico
    const Cb = 1.0;
    const Fcr = Cb * Math.PI * Math.PI * E / ((Lb_cm / rts) ** 2) *
      Math.sqrt(1 + 0.078 * JcSxho * (Lb_cm / rts) ** 2);
    Mn = Fcr * Sx / 1e3; // [kN·m]
    Mn = Math.min(Mn, Mp);
    zona = 'elástica';
  }

  const phiMn = phi_b * Mn;

  return {
    Mn, phiMn, Mp,
    Lp: Lp / 100,  // [m]
    Lr: Lr / 100,  // [m]
    Lb_usado: Lb,  // [m] — Lb efectivo usado (para trazabilidad)
    zona,
  };
}

// ─── Corte — φVn (Art. G2) ───────────────────────────────────────────

/**
 * Resistencia nominal a corte.
 *
 * @param {Object} perfil - Perfil W
 * @param {number} Fy     - Tensión de fluencia [MPa]
 * @returns {{ Vn, phiVn }}
 */
export function corteVn(perfil, Fy) {
  const { d, tw } = perfil; // mm
  const Aw = d * tw / 100; // [cm²] (mm × mm / 100)
  const Cv1 = 1.0; // conservador para perfiles W laminados típicos (h/tw < 2.24√(E/Fy))

  const Vn = 0.6 * Fy * Aw / 10; // [kN] (MPa × cm² / 10)
  const phiVn = phi_v * Vn;

  return { Vn, phiVn, Cv1 };
}

// ─── Interacción H1-1 ────────────────────────────────────────────────

/**
 * Verificación de interacción flexo-compresión (Art. H1-1).
 *
 * @param {number} Pr   - Solicitación axial de compresión [kN] (positivo = compresión)
 * @param {number} Mrx  - Solicitación de momento flector [kN·m] (valor absoluto)
 * @param {number} phiPn - Resistencia de diseño a compresión [kN]
 * @param {number} phiMnx - Resistencia de diseño a flexión [kN·m]
 * @returns {{ ratio, formula, pasa }}
 */
export function interaccionH1(Pr, Mrx, phiPn, phiMnx) {
  const Pr_abs = Math.abs(Pr);
  const Mrx_abs = Math.abs(Mrx);

  // Caso sin compresión significativa
  if (phiPn <= 0) return { ratio: 999, formula: 'H1-err', pasa: false };

  const ratio_axial = Pr_abs / phiPn;

  let ratio;
  let formula;

  if (ratio_axial < 0.2) {
    // H1-1b: Pr/(2φPn) + [Mrx/φMnx] ≤ 1.0
    ratio = Pr_abs / (2 * phiPn) + Mrx_abs / phiMnx;
    formula = 'H1-1b';
  } else {
    // H1-1a: Pr/φPn + (8/9)[Mrx/φMnx] ≤ 1.0
    ratio = ratio_axial + (8 / 9) * Mrx_abs / phiMnx;
    formula = 'H1-1a';
  }

  return { ratio, formula, pasa: ratio <= 1.0 };
}

// ─── Verificación de flecha ──────────────────────────────────────────

/**
 * Verificación de flecha de servicio.
 *
 * @param {Object} deflections - { columna: { deltaH }, rafter: { deltaV } } [m]
 * @param {number} he - Altura de alero [m]
 * @param {number} Lrafter - Longitud del rafter [m]
 * @returns {{ columna: { delta, limite, ratio, pasa }, rafter: { delta, limite, ratio, pasa } }}
 */
export function verificarFlecha(deflections, he, Lrafter) {
  const limCol = he / 150;      // H/150 para viento
  const limRaf = Lrafter / 240; // L/240 para D+Lr

  const ratioCol = deflections.columna.deltaH / limCol;
  const ratioRaf = deflections.rafter.deltaV / limRaf;

  return {
    columna: {
      delta: deflections.columna.deltaH * 1000, // [mm]
      limite: limCol * 1000, // [mm]
      ratio: ratioCol,
      pasa: ratioCol <= 1.0,
    },
    rafter: {
      delta: deflections.rafter.deltaV * 1000,
      limite: limRaf * 1000,
      ratio: ratioRaf,
      pasa: ratioRaf <= 1.0,
    },
  };
}

// ─── Verificación completa de un perfil ──────────────────────────────

/**
 * Realiza todas las verificaciones para un perfil en un rol dado.
 *
 * @param {Object} perfil - Perfil W
 * @param {Object} solicitaciones - { N [kN], V [kN], M [kN·m] } (valores máximos de envolvente)
 * @param {Object} params
 * @param {number} params.KLx  - Longitud efectiva pandeo eje fuerte [m]
 * @param {number} params.KLy  - Longitud efectiva pandeo eje débil [m]
 * @param {number} params.Lb   - Longitud sin arriostramiento lateral [m]
 * @param {number} params.Fy   - Tensión de fluencia [MPa]
 * @param {number} params.E    - Módulo de elasticidad [MPa]
 * @returns {{ pasa, ratioH1, ratioFlecha, phiPn, phiMn, phiVn, detalles }}
 */
export function verificarPerfil(perfil, solicitaciones, params) {
  const { KLx, KLy, Lb, Fy, E } = params;
  const { N, V, M } = solicitaciones;

  // Compresión: eje fuerte con KLx, eje débil con KLy
  const pnX = compresionPn(perfil, KLx, 'x', Fy, E);
  const pnY = compresionPn(perfil, KLy, 'y', Fy, E);
  const phiPn = Math.min(pnX.phiPn, pnY.phiPn);

  // Flexión (pandeo lateral-torsional)
  const mn = flexionMn(perfil, Lb, Fy, E);

  // Corte
  const vn = corteVn(perfil, Fy);

  // Interacción H1
  const h1 = interaccionH1(N, M, phiPn, mn.phiMn);

  // Corte
  const ratioCorte = Math.abs(V) / vn.phiVn;

  const pasa = h1.pasa && ratioCorte <= 1.0;

  return {
    pasa,
    ratioH1: h1.ratio,
    formulaH1: h1.formula,
    ratioCorte,
    phiPn,
    phiMn: mn.phiMn,
    phiVn: vn.phiVn,
    zona: mn.zona,
    KLr: Math.max(pnX.KLr, pnY.KLr),
    detalles: { pnX, pnY, mn, vn, h1 },
  };
}
