/**
 * diagramas.js — Reconstrucción de diagramas de esfuerzos y deformada
 *
 * Método: recuperación de carga distribuida equivalente por equilibrio estático.
 *
 * Convención del solver (frameSolver.js):
 *   Vi = -fLocal[1]  (signo invertido respecto a fuerza interna de corte)
 *   Mi = -fLocal[2]  (= momento interno real en nodo i)
 *   Vj = fLocal[4]   (signo invertido respecto a fuerza interna de corte)
 *   Mj = fLocal[5]   (= momento interno real en nodo j)
 *
 * Del equilibrio del elemento libre: fLocal[1]+fLocal[4]+w·L=0
 *   → w_recovered = (Vi − Vj) / L
 *   → V_internal(x) = −Vi + w·x
 *   → M_internal(x) = Mi − Vi·x + w·x²/2
 *   → N(x) = Ni + (Nj−Ni)·x/L  (interpolación lineal)
 *
 * Deformada: interpolación de Hermite cúbica entre desplazamientos nodales.
 *
 * Geometría del pórtico (5 nodos, 4 elementos):
 *   Nodo 0: (0, 0)    — base izq
 *   Nodo 1: (0, he)   — alero izq
 *   Nodo 2: (B/2, hc) — cumbrera
 *   Nodo 3: (B, he)   — alero der
 *   Nodo 4: (B, 0)    — base der
 */

// ─── Geometría del modelo ───────────────────────────────────────────────────

/** Posiciones nodales en metros [x, y] */
export function nodePositions({ B, he, hc }) {
  return [
    [0,     0  ],   // 0: base izq
    [0,     he ],   // 1: alero izq
    [B / 2, hc ],   // 2: cumbrera
    [B,     he ],   // 3: alero der
    [B,     0  ],   // 4: base der
  ];
}

// Conectividad: elemIdx → [nodoI, nodoJ]
const CONN = [[0, 1], [1, 2], [2, 3], [3, 4]];

// ─── Diagramas de esfuerzos ─────────────────────────────────────────────────

/**
 * Reconstruye V_internal(x), M_internal(x), N(x) a lo largo del elemento.
 * Muestrea cada 1 m + extremos del elemento.
 *
 * @param {Object} ef — fuerzas del solver: { Vi, Mi, Ni, Vj, Mj, Nj, L }
 * @returns {{ xs, V, M, N }}
 */
export function fieldDiagram(ef) {
  const { Vi, Mi, Ni, Vj, Nj, L } = ef;
  // Carga distribuida recuperada por equilibrio: fLocal[1]+fLocal[4]+w·L=0
  const wPerp = L > 1e-9 ? (Vi - Vj) / L : 0;

  // Muestreo: x=0, cada 1m, x=L
  const xs = [0];
  for (let x = 1.0; x < L - 0.01; x += 1.0) xs.push(x);
  if (xs[xs.length - 1] < L - 0.01) xs.push(L);

  const V = [], M = [], N = [];
  for (const x of xs) {
    // V_internal = -Vi + w·x  (Vi del solver = -V_interno)
    V.push(-Vi + wPerp * x);
    // M_internal = Mi - Vi·x + w·x²/2  (Mi del solver = M_interno)
    M.push(Mi - Vi * x + wPerp * x * x / 2);
    // N interpolado linealmente
    N.push(L > 1e-9 ? Ni + (Nj - Ni) * x / L : Ni);
  }
  return { xs, V, M, N };
}

/**
 * Calcula diagramas globales para todos los elementos de una combinación.
 *
 * @param {Object} geo           — { B, he, hc }
 * @param {Object} comboResult   — { elementForces, displacements }
 * @param {number} nPts          — puntos por elemento
 * @returns {Array} elementData — por elemento:
 *   { xi, yi, xj, yj, theta, L,
 *     xs, V, M, N,
 *     ptsGlobal: [{px, py}],  // puntos sobre el eje del elemento
 *     perpX, perpY }          // dirección perpendicular unitaria (local y en global)
 */
export function computarDiagramas(geo, comboResult) {
  const nodes = nodePositions(geo);
  const { elementForces } = comboResult;

  return elementForces.map((ef, e) => {
    const [ni, nj] = CONN[e];
    const [xi, yi] = nodes[ni];
    const [xj, yj] = nodes[nj];
    const theta = ef.theta;
    const L     = ef.L;

    const { xs, V, M, N } = fieldDiagram(ef);

    // Puntos sobre el eje del elemento en coordenadas globales
    const c = Math.cos(theta), s = Math.sin(theta);
    const ptsGlobal = xs.map(x => ({
      px: xi + x * c,
      py: yi + x * s,
    }));

    // Dirección perpendicular al elemento (local +y → global)
    const perpX = -s;
    const perpY =  c;

    return { xi, yi, xj, yj, theta, L, xs, V, M, N, ptsGlobal, perpX, perpY };
  });
}

// ─── Deformada ─────────────────────────────────────────────────────────────

/**
 * Interpola la deformada usando funciones de forma de Hermite cúbicas.
 *
 * Hermite shape functions (ξ = x/L ∈ [0,1]):
 *   H1 = 1 − 3ξ² + 2ξ³
 *   H2 = L(ξ − 2ξ² + ξ³)
 *   H3 = 3ξ² − 2ξ³
 *   H4 = L(−ξ² + ξ³)
 *   v_local(ξ) = H1·v_li + H2·θ_i + H3·v_lj + H4·θ_j
 *   u_local(ξ) = (1−ξ)·u_li + ξ·u_lj   (lineal axial)
 *
 * @param {Object} geo          — { B, he, hc }
 * @param {Object} comboResult  — { elementForces, displacements }
 * @param {number} scale        — factor de amplificación (ej. 200)
 * @param {number} nPts         — puntos por elemento
 * @returns {Array}  — por elemento: { pts: [{px, py}] }
 */
export function computarDeformada(geo, comboResult, scale, nPts = 30) {
  const nodes = nodePositions(geo);
  const { elementForces, displacements: U } = comboResult;
  if (!U) return elementForces.map(() => ({ pts: [] }));

  return elementForces.map((ef, e) => {
    const [ni, nj] = CONN[e];
    const [xi, yi] = nodes[ni];
    const theta = ef.theta;
    const L     = ef.L;
    const c = Math.cos(theta), s = Math.sin(theta);

    // Desplazamientos globales nodales
    const uig = U[ni * 3], vig = U[ni * 3 + 1], thi = U[ni * 3 + 2];
    const ujg = U[nj * 3], vjg = U[nj * 3 + 1], thj = U[nj * 3 + 2];

    // Transformar a coordenadas locales del elemento
    const u_li =  c * uig + s * vig;   // axial local nodo i
    const v_li = -s * uig + c * vig;   // transversal local nodo i
    const u_lj =  c * ujg + s * vjg;
    const v_lj = -s * ujg + c * vjg;

    const pts = [];
    for (let k = 0; k < nPts; k++) {
      const xi_local = k / (nPts - 1);   // ξ ∈ [0,1]
      const x        = xi_local * L;
      const xi2 = xi_local * xi_local;
      const xi3 = xi2 * xi_local;

      // Hermite shape functions
      const H1 = 1 - 3 * xi2 + 2 * xi3;
      const H2 = L * (xi_local - 2 * xi2 + xi3);
      const H3 = 3 * xi2 - 2 * xi3;
      const H4 = L * (-xi2 + xi3);

      // Desplazamiento local en el punto
      const u_loc = (1 - xi_local) * u_li + xi_local * u_lj;         // lineal axial
      const v_loc = H1 * v_li + H2 * thi + H3 * v_lj + H4 * thj;    // cúbico transversal

      // Transformar a global y amplificar
      const u_g = c * u_loc - s * v_loc;
      const v_g = s * u_loc + c * v_loc;

      pts.push({
        px: xi + x * c + scale * u_g,
        py: yi + x * s + scale * v_g,
      });
    }
    return { pts };
  });
}

// ─── Auto-escala ────────────────────────────────────────────────────────────

/**
 * Calcula la escala en m / (kN·m) o m / kN para que el diagrama sea legible.
 * El diagrama no superará maxFrac × charSize de tamaño.
 */
export function autoScale(elems, tipo, charSize, maxFrac = 0.32) {
  let maxAbs = 0;
  for (const el of elems) {
    const arr = tipo === 'M' ? el.M : tipo === 'V' ? el.V : el.N;
    for (const v of arr) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  }
  if (maxAbs < 1e-6) return 1;
  return (maxFrac * charSize) / maxAbs;
}

/**
 * Calcula el factor de amplificación para la deformada.
 * Amplifica para que el desplazamiento máximo sea ~12% del tamaño característico.
 */
export function autoDeformScale(comboResult, charSize) {
  const U = comboResult?.displacements;
  if (!U) return 200;
  let maxDisp = 0;
  for (let i = 0; i < U.length; i++) {
    const v = Math.abs(U[i]);
    if (v > maxDisp) maxDisp = v;
  }
  if (maxDisp < 1e-9) return 200;
  // Limit to reasonable range: between 10x and 5000x
  const raw = (0.12 * charSize) / maxDisp;
  return Math.min(5000, Math.max(10, raw));
}

// ─── Utilidades de segmentación por signo ──────────────────────────────────

/**
 * Divide los puntos de un diagrama en segmentos de signo constante,
 * interpolando el punto de cruce por cero.
 * Retorna: Array<{ positive: bool, polyPoints: [px, py][] }>
 *   donde polyPoints forma un polígono cerrado (eje + curva de diagrama).
 */
export function segmentsBySign(arr, ptsGlobal, perpX, perpY, scale) {
  if (!arr.length) return [];

  // Construir lista enriquecida con cruces de cero interpolados
  const pts = [];
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i - 1] * arr[i] < 0) {
      // Interpolación lineal del cruce por cero
      const t   = arr[i - 1] / (arr[i - 1] - arr[i]);
      const px  = ptsGlobal[i - 1].px + t * (ptsGlobal[i].px - ptsGlobal[i - 1].px);
      const py  = ptsGlobal[i - 1].py + t * (ptsGlobal[i].py - ptsGlobal[i - 1].py);
      pts.push({ v: 0, px, py });
    }
    pts.push({ v: arr[i], px: ptsGlobal[i].px, py: ptsGlobal[i].py });
  }

  // Dividir en segmentos contiguos por signo.
  // Los puntos v=0 (cruces por cero) son frontera: cierran el segmento
  // anterior y abren el siguiente (compartidos por ambos).
  const segments = [];
  let seg = [pts[0]];

  for (let i = 1; i < pts.length; i++) {
    if (pts[i].v === 0) {
      // Punto de cruce: cierra segmento actual y empieza uno nuevo
      seg.push(pts[i]);
      if (seg.length >= 2) segments.push(buildSeg(seg, perpX, perpY, scale));
      seg = [pts[i]]; // compartir el punto frontera
    } else if (seg.length > 0 && seg[seg.length - 1].v !== 0 &&
               Math.sign(pts[i].v) !== Math.sign(seg[seg.length - 1].v)) {
      // Cambio de signo sin punto cero intermedio (robustez)
      if (seg.length >= 2) segments.push(buildSeg(seg, perpX, perpY, scale));
      seg = [pts[i]];
    } else {
      seg.push(pts[i]);
    }
  }
  if (seg.length >= 2) segments.push(buildSeg(seg, perpX, perpY, scale));
  return segments;
}

function buildSeg(pts, perpX, perpY, scale) {
  const nonZero = pts.find(p => Math.abs(p.v) > 1e-9);
  const positive = nonZero ? nonZero.v > 0 : true;

  // Polígono: eje del elemento (i→j) + curva del diagrama (j→i)
  const fwd  = pts.map(p => [p.px + p.v * scale * perpX, p.py + p.v * scale * perpY]);
  const back = [...pts].reverse().map(p => [p.px, p.py]);
  return { positive, polyPoints: [...fwd, ...back] };
}
