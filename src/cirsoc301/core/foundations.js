/**
 * foundations.js — Predimensionado de fundaciones según práctica argentina
 *
 * Métodos utilizados:
 *  - Capacidad portante: Terzaghi general (1943) con factores de forma cuadrada
 *    q_ult = 1.3·c·Nc + γ·Df·Nq + 0.4·γ·B·Nγ   [kPa]
 *    σ_adm = q_ult / FS;   FS = 3 (estado límite de servicio, práctica argentina)
 *
 *  - Capacidad de pilotes (Meyerhof):
 *    Q_s = π·D·L·τ_u   (fricción)
 *    Q_p = (π/4)·D²·q_p  (punta)
 *    Q_adm = (Q_s + Q_p) / FS;  FS = 2.5
 *
 *  - Verificación de vuelco (fundación con momento):
 *    σ_max = N/A + M·(B/2)/(B²·L/6) ≤ σ_adm
 *    σ_min ≥ 0   (sin despegue)
 *
 * Nota: estos resultados son para predimensionado. Siempre verificar con
 * estudio geotécnico específico del sitio (CIRSOC 601 / IRAM-IAS U 500-X).
 */

// ─── Factores de capacidad de carga (Meyerhof) ──────────────────────────────

/**
 * Calcula factores de capacidad portante Nc, Nq, Nγ (Meyerhof).
 * @param {number} phi - Ángulo de fricción interna [°]
 */
export function factoresCapacidad(phi) {
  const phiR = phi * Math.PI / 180;
  const tanPhi = Math.tan(phiR);

  if (phi <= 0.01) {
    return { Nc: 5.14, Nq: 1.0, Ng: 0.0 };
  }

  const Nq = Math.exp(Math.PI * tanPhi) * Math.pow(Math.tan(Math.PI / 4 + phiR / 2), 2);
  const Nc = (Nq - 1) / tanPhi;
  const Ng = 2 * (Nq + 1) * tanPhi;

  return { Nc, Nq, Ng };
}

// ─── Capacidad portante — Terzaghi para zapata cuadrada ─────────────────────

/**
 * Calcula la capacidad portante última y admisible para zapata cuadrada
 * (Terzaghi 1943, forma cuadrada: 1.3·c·Nc + q·Nq + 0.4·γ·B·Nγ).
 *
 * @param {Object} p
 * @param {number} p.c      - Cohesión [kPa]
 * @param {number} p.phi    - Ángulo de fricción [°]
 * @param {number} p.gamma  - Peso unitario [kN/m³]
 * @param {number} p.Df     - Profundidad de fundación [m]
 * @param {number} p.B      - Lado de la zapata [m]
 * @param {number} [p.FS=3] - Factor de seguridad
 * @returns {{ qUlt, qAdm, Nc, Nq, Ng, q }}
 */
export function capacidadPortante({ c, phi, gamma, Df, B, FS = 3 }) {
  const { Nc, Nq, Ng } = factoresCapacidad(phi);
  const q = gamma * Df; // presión de sobrecarga
  const qUlt = 1.3 * c * Nc + q * Nq + 0.4 * gamma * B * Ng;
  const qAdm = qUlt / FS;
  return { qUlt: +qUlt.toFixed(1), qAdm: +qAdm.toFixed(1), Nc: +Nc.toFixed(2), Nq: +Nq.toFixed(2), Ng: +Ng.toFixed(2), q: +q.toFixed(1) };
}

// ─── Zapata superficial ──────────────────────────────────────────────────────

/**
 * Predimensiona zapata superficial (cuadrada) con verificación de vuelco.
 *
 * @param {Object} p
 * @param {number} p.N         - Axial de cálculo [kN] (de la envolvente, positivo compresión)
 * @param {number} p.V         - Corte en base [kN]
 * @param {number} p.M         - Momento en base [kN·m] (0 si articulada)
 * @param {number} p.c         - Cohesión suelo [kPa]
 * @param {number} p.phi       - Fricción suelo [°]
 * @param {number} p.gamma     - Peso unitario suelo [kN/m³]
 * @param {number} p.Df        - Cota fundación [m]
 * @param {string} p.tipoBase  - 'empotrada' | 'articulada'
 * @returns {Object}
 */
export function fundacionSuperficial({ N, V, M, c, phi, gamma, Df, tipoBase }) {
  const FS = 3;
  const N_abs = Math.abs(N);
  const M_abs = tipoBase === 'empotrada' ? Math.abs(M) : 0;

  // Peso propio estimado de la zapata (10%)
  const Ntotal = N_abs * 1.10;

  // Primera iteración: estimar B desde carga axial
  let B = Math.max(Math.sqrt(Ntotal / 100), 0.6); // arrancar con σadm=100 kPa

  // Iterar hasta convergencia (máx 8 iteraciones)
  for (let iter = 0; iter < 8; iter++) {
    const cap = capacidadPortante({ c, phi, gamma, Df, B, FS });
    const B_nuevo = Math.max(Math.sqrt(Ntotal / cap.qAdm), 0.6);

    // Si hay momento, ampliar por excentricidad
    const e = M_abs / Math.max(N_abs, 1);
    const B_por_excent = 2 * e + Math.max(B_nuevo * 0.6, 0.5);
    const B_it = Math.max(B_nuevo, e > 0 ? B_por_excent : 0, 0.6);

    if (Math.abs(B_it - B) < 0.02) { B = B_it; break; }
    B = B_it;
  }

  // Redondear a múltiplos de 10 cm
  B = Math.ceil(B * 10) / 10;
  const L = B; // zapata cuadrada

  // Capacidad portante final con B definitivo
  const cap = capacidadPortante({ c, phi, gamma, Df, B, FS });

  // Verificación de presiones en base (kern)
  const A = B * L;
  const W_zap = B * L * (Df * 0.4) * 24; // peso aprox zapata (H≈0.4B)
  const N_serv = N_abs + W_zap;
  const sigma_cent = N_serv / A;
  const e_exc = M_abs / Math.max(N_abs, 0.01);
  const sigma_max = sigma_cent + (M_abs * (B / 2)) / (B * B * L / 6);
  const sigma_min = sigma_cent - (M_abs * (B / 2)) / (B * B * L / 6);
  const kern_ok = e_exc <= B / 6; // sin despegue

  // Altura de zapata (heurística: ~1/3 del voladizo, mín 30cm)
  const voladizo = (B - 0.4) / 2; // suponiendo columna 40cm
  const alto = Math.max(Math.ceil(Math.max(voladizo * 0.5, 0.30) * 10) / 10, 0.30);

  // Pedestal
  const altoPedestal = Math.max(Df - alto, 0);
  const anchoPedestal = 0.40;

  const volZapata = B * L * alto;
  const volPedestal = altoPedestal > 0 ? anchoPedestal ** 2 * altoPedestal : 0;

  return {
    B, L, alto,
    pedestal: { ancho: anchoPedestal, alto: +altoPedestal.toFixed(2) },
    volumen: +( volZapata + volPedestal).toFixed(2),
    // Tensiones
    sigma_max: +sigma_max.toFixed(1),
    sigma_min: +sigma_min.toFixed(1),
    sigma_adm: cap.qAdm,
    kern_ok,
    e_exc: +e_exc.toFixed(2),
    // Capacidad portante
    cap,
    // Verificación
    pasa_tension: sigma_max <= cap.qAdm,
    pasa_kern: kern_ok,
    pasa: sigma_max <= cap.qAdm && kern_ok,
  };
}

// ─── Pilotes ─────────────────────────────────────────────────────────────────

/**
 * Predimensiona fundación en pilotes perforados.
 *
 * @param {Object} p
 * @param {number} p.N          - Axial [kN]
 * @param {number} p.M          - Momento [kN·m]
 * @param {number} p.tauFric    - Fricción lateral unitaria [kN/m²]
 * @param {number} p.qTip       - Resistencia de punta [kN/m²]
 * @param {number} p.D          - Diámetro pilote [m]
 * @param {number} p.Lpilote    - Longitud pilote [m]
 * @param {string} p.tipoBase   - 'empotrada' | 'articulada'
 * @param {number} [p.FS=2.5]   - Factor de seguridad
 * @returns {Object}
 */
export function fundacionPilotes({ N, M, tauFric, qTip, D, Lpilote, tipoBase, FS = 2.5 }) {
  const N_abs = Math.abs(N);
  const M_abs = tipoBase === 'empotrada' ? Math.abs(M) : 0;
  const Ntotal = N_abs * 1.10;

  // Capacidad por pilote
  const Qs = Math.PI * D * Lpilote * tauFric;          // fricción total [kN]
  const Qp = (Math.PI / 4) * D ** 2 * qTip;            // punta [kN]
  const Qpilote_ult = Qs + Qp;
  const Qpilote_adm = Qpilote_ult / FS;

  // Número de pilotes necesarios (por axial)
  let nPilotes = Math.max(Math.ceil(Ntotal / Qpilote_adm), 2);

  // Con momento necesitamos al menos 4 (par)
  if (M_abs > 0 && tipoBase === 'empotrada') {
    nPilotes = Math.max(nPilotes, 4);
  }
  // Hacerlo número par (2 filas)
  if (nPilotes % 2 !== 0) nPilotes++;

  // Separación mínima entre pilotes: 3D (práctica argentina)
  const sep_pilotes = Math.max(3 * D, 0.9);

  // Verificación carga máxima en pilote de esquina (con momento)
  const nc_lado = nPilotes <= 2 ? 1 : Math.ceil(Math.sqrt(nPilotes));
  const nc_efectivo = Math.ceil(nPilotes / 2);

  // Dimensiones del dado de cabecera
  let anchoDado;
  if (nPilotes <= 2) {
    anchoDado = sep_pilotes + D + 2 * Math.max(D, 0.20);
  } else {
    const filas = 2;
    const cols = Math.ceil(nPilotes / filas);
    anchoDado = (cols - 1) * sep_pilotes + D + 2 * Math.max(D, 0.20);
  }
  anchoDado = Math.ceil(anchoDado * 10) / 10;
  const altoDado = Math.max(2 * D, 0.70);  // ≥2D y ≥70cm

  // Carga máx por pilote (con excentricidad de momento)
  const c_max = (nc_efectivo > 1 ? sep_pilotes : 0.001);
  const Q_max_pilote = Ntotal / nPilotes + M_abs * c_max / (nPilotes * c_max ** 2 / nPilotes);

  return {
    nPilotes,
    D,
    Lpilote,
    sep_pilotes: +sep_pilotes.toFixed(2),
    Qs: +Qs.toFixed(1),
    Qp: +Qp.toFixed(1),
    Qpilote_ult: +Qpilote_ult.toFixed(1),
    Qpilote_adm: +Qpilote_adm.toFixed(1),
    Q_max_pilote: +Q_max_pilote.toFixed(1),
    anchoDado: +anchoDado.toFixed(2),
    altoDado: +altoDado.toFixed(2),
    volDado: +(anchoDado ** 2 * altoDado).toFixed(2),
    pasa: Q_max_pilote <= Qpilote_adm,
  };
}

// ─── Cálculo completo de fundaciones de la nave ─────────────────────────────

/**
 * Calcula fundaciones para toda la nave.
 *
 * @param {Object} params
 * @param {Object} params.envolvente  - { columna: { Nmax, Vmax, Mmax } }
 * @param {Object} params.geo         - { nPorticos, tipoBase }
 * @param {Object} params.fundInp     - Parámetros del suelo y tipo de fundación
 * @returns {Object}
 */
export function calcularFundaciones({ envolvente, geo, fundInp }) {
  const { tipoBase, nPorticos } = geo;
  const nBases = nPorticos * 2;

  const N = envolvente?.columna?.Nmax ?? 0;
  const V = envolvente?.columna?.Vmax ?? 0;
  const M = tipoBase === 'empotrada' ? (envolvente?.columna?.Mmax ?? 0) : 0;

  const c     = fundInp.c     ?? 30;
  const phi   = fundInp.phi   ?? 20;
  const gamma = fundInp.gamma ?? 18;
  const Df    = fundInp.cotaFund ?? 1.5;

  let base;

  if (fundInp.tipoFund === 'pilotes') {
    base = fundacionPilotes({
      N, M,
      tauFric:  fundInp.tauFric  ?? 30,
      qTip:     fundInp.qTip     ?? 400,
      D:        fundInp.D_pilote ?? 0.40,
      Lpilote:  fundInp.L_pilote ?? 8,
      tipoBase,
    });

    return {
      tipo: 'pilotes',
      base,
      nBases,
      volTotalHormigon: +(base.volDado * nBases).toFixed(1),
      nPilotesTotal: base.nPilotes * nBases,
      pasa: base.pasa,
    };
  } else {
    base = fundacionSuperficial({ N, V, M, c, phi, gamma, Df, tipoBase });

    return {
      tipo: 'superficial',
      base,
      nBases,
      volTotalHormigon: +(base.volumen * nBases).toFixed(1),
      pasa: base.pasa,
    };
  }
}
