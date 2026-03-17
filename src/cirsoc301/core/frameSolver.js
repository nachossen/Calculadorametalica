/**
 * frameSolver.js — Solver de rigidez directa 2D para pórtico plano
 *
 * Elementos viga Euler-Bernoulli, 3 DOF/nodo (u, v, θ).
 * Soporta empotrado y articulado en bases con condiciones de borde exactas.
 *
 * Modelo pórtico a dos aguas simétrico:
 *   Nodo 0: base izquierda
 *   Nodo 1: alero izquierdo (tope columna izq)
 *   Nodo 2: cumbrera
 *   Nodo 3: alero derecho (tope columna der)
 *   Nodo 4: base derecha
 *
 *   Elem 0: columna izq  (0→1)
 *   Elem 1: rafter izq   (1→2)
 *   Elem 2: rafter der    (2→3)
 *   Elem 3: columna der   (3→4)
 */

// ─── Utilidades de álgebra lineal ────────────────────────────────────

/** Crea matriz NxN de ceros */
function zeros(n) {
  const m = new Array(n);
  for (let i = 0; i < n; i++) m[i] = new Float64Array(n);
  return m;
}

/** Crea vector de N ceros */
function zvec(n) { return new Float64Array(n); }

/** Resuelve Ax = b por eliminación gaussiana con pivoteo parcial (in-place) */
function solveLinear(A, b) {
  const n = b.length;
  // Copia para no mutar
  const a = A.map(row => Float64Array.from(row));
  const x = Float64Array.from(b);

  for (let col = 0; col < n; col++) {
    // Pivoteo parcial
    let maxVal = Math.abs(a[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(a[row][col]);
      if (v > maxVal) { maxVal = v; maxRow = row; }
    }
    if (maxVal < 1e-14) throw new Error(`Matriz singular en columna ${col}`);
    if (maxRow !== col) {
      [a[col], a[maxRow]] = [a[maxRow], a[col]];
      [x[col], x[maxRow]] = [x[maxRow], x[col]];
    }
    // Eliminación
    const pivot = a[col][col];
    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / pivot;
      for (let j = col; j < n; j++) a[row][j] -= factor * a[col][j];
      x[row] -= factor * x[col];
    }
  }
  // Sustitución hacia atrás
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i + 1; j < n; j++) x[i] -= a[i][j] * x[j];
    x[i] /= a[i][i];
  }
  return x;
}

// ─── Matrices de rigidez y cargas equivalentes ───────────────────────

/**
 * Matriz de rigidez local 6×6 (viga Euler-Bernoulli) en coordenadas locales.
 * DOF locales: [u1, v1, θ1, u2, v2, θ2]
 */
function localStiffness(E, A, I, L) {
  const k = zeros(6);
  const EA_L = E * A / L;
  const EI_L3 = E * I / (L * L * L);
  const EI_L2 = E * I / (L * L);
  const EI_L = E * I / L;

  // Axial
  k[0][0] = EA_L;  k[0][3] = -EA_L;
  k[3][0] = -EA_L; k[3][3] = EA_L;

  // Flexión
  k[1][1] = 12 * EI_L3;  k[1][2] = 6 * EI_L2;   k[1][4] = -12 * EI_L3; k[1][5] = 6 * EI_L2;
  k[2][1] = 6 * EI_L2;   k[2][2] = 4 * EI_L;     k[2][4] = -6 * EI_L2;  k[2][5] = 2 * EI_L;
  k[4][1] = -12 * EI_L3; k[4][2] = -6 * EI_L2;   k[4][4] = 12 * EI_L3;  k[4][5] = -6 * EI_L2;
  k[5][1] = 6 * EI_L2;   k[5][2] = 2 * EI_L;     k[5][4] = -6 * EI_L2;  k[5][5] = 4 * EI_L;

  return k;
}

/**
 * Matriz de rigidez local 6×6 con articulación en nodo j (Mj = 0).
 * Condensación estática: se elimina el DOF rotacional en nodo j.
 * DOF locales: [u1, v1, θ1, u2, v2, θ2] — fila/col 5 = 0
 */
function localStiffnessHingeJ(E, A, I, L) {
  const k = zeros(6);
  const EA_L = E * A / L;
  const EI_L3 = E * I / (L * L * L);
  const EI_L2 = E * I / (L * L);
  const EI_L = E * I / L;

  // Axial (sin cambio)
  k[0][0] = EA_L;  k[0][3] = -EA_L;
  k[3][0] = -EA_L; k[3][3] = EA_L;

  // Flexión condensada (hinge en j → 3EI terms)
  k[1][1] = 3 * EI_L3;   k[1][2] = 3 * EI_L2;   k[1][4] = -3 * EI_L3;
  k[2][1] = 3 * EI_L2;   k[2][2] = 3 * EI_L;     k[2][4] = -3 * EI_L2;
  k[4][1] = -3 * EI_L3;  k[4][2] = -3 * EI_L2;   k[4][4] = 3 * EI_L3;
  // fila 5 y col 5 = 0 (Mj = 0)

  return k;
}

/**
 * Matriz de rigidez local 6×6 con articulación en nodo i (Mi = 0).
 * Condensación estática: se elimina el DOF rotacional en nodo i.
 * DOF locales: [u1, v1, θ1, u2, v2, θ2] — fila/col 2 = 0
 */
function localStiffnessHingeI(E, A, I, L) {
  const k = zeros(6);
  const EA_L = E * A / L;
  const EI_L3 = E * I / (L * L * L);
  const EI_L2 = E * I / (L * L);
  const EI_L = E * I / L;

  // Axial (sin cambio)
  k[0][0] = EA_L;  k[0][3] = -EA_L;
  k[3][0] = -EA_L; k[3][3] = EA_L;

  // Flexión condensada (hinge en i → 3EI terms)
  k[1][1] = 3 * EI_L3;   k[1][4] = -3 * EI_L3;  k[1][5] = 3 * EI_L2;
  k[4][1] = -3 * EI_L3;  k[4][4] = 3 * EI_L3;   k[4][5] = -3 * EI_L2;
  k[5][1] = 3 * EI_L2;   k[5][4] = -3 * EI_L2;  k[5][5] = 3 * EI_L;
  // fila 2 y col 2 = 0 (Mi = 0)

  return k;
}

/**
 * Matriz de transformación 6×6 local→global.
 * θ = ángulo del elemento medido desde eje X global.
 */
function transformationMatrix(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const T = zeros(6);

  T[0][0] = c;  T[0][1] = s;
  T[1][0] = -s; T[1][1] = c;
  T[2][2] = 1;
  T[3][3] = c;  T[3][4] = s;
  T[4][3] = -s; T[4][4] = c;
  T[5][5] = 1;

  return T;
}

/** Multiplica T^t · K · T (6×6) */
function transformToGlobal(kLocal, T) {
  const n = 6;
  // temp = K · T
  const temp = zeros(n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        temp[i][j] += kLocal[i][k] * T[k][j];

  // result = T^t · temp
  const result = zeros(n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        result[i][j] += T[k][i] * temp[k][j];

  return result;
}

/** Transforma vector 6×1 de local a global: T^t · f */
function transformVecToGlobal(fLocal, T) {
  const n = 6;
  const result = zvec(n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      result[i] += T[j][i] * fLocal[j];
  return result;
}

/** Transforma vector 6×1 de global a local: T · d */
function transformVecToLocal(dGlobal, T) {
  const n = 6;
  const result = zvec(n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      result[i] += T[i][j] * dGlobal[j];
  return result;
}

/**
 * Fuerzas de empotramiento perfecto para carga distribuida uniforme
 * perpendicular al eje del elemento (en coordenadas locales).
 *
 * w: carga [kN/m] positiva en sentido local +v (perpendicular al eje)
 * L: longitud del elemento [m]
 *
 * Retorna vector [fx1, fy1, m1, fx2, fy2, m2] en coord. locales.
 */
function fixedEndForces_uniform_perp(w, L) {
  const f = zvec(6);
  f[1] = w * L / 2;          // V1
  f[2] = w * L * L / 12;     // M1
  f[4] = w * L / 2;          // V2
  f[5] = -w * L * L / 12;    // M2
  return f;
}

/**
 * Fuerzas de empotramiento perfecto para carga distribuida uniforme
 * axial (en coordenadas locales).
 *
 * p: carga [kN/m] positiva en dirección local +u (tracción)
 * L: longitud del elemento [m]
 */
function fixedEndForces_uniform_axial(p, L) {
  const f = zvec(6);
  f[0] = p * L / 2;
  f[3] = p * L / 2;
  return f;
}

/**
 * FEF para carga distribuida uniforme perpendicular con articulación en nodo j.
 * Viga empotrada-articulada: V1=5wL/8, M1=wL²/8, V2=3wL/8, M2=0
 */
function fixedEndForces_uniform_perp_hingeJ(w, L) {
  const f = zvec(6);
  f[1] = 5 * w * L / 8;        // V1
  f[2] = w * L * L / 8;        // M1
  f[4] = 3 * w * L / 8;        // V2
  // f[5] = 0;                  // M2 = 0 (articulación)
  return f;
}

/**
 * FEF para carga distribuida uniforme perpendicular con articulación en nodo i.
 * Viga articulada-empotrada: V1=3wL/8, M1=0, V2=5wL/8, M2=-wL²/8
 */
function fixedEndForces_uniform_perp_hingeI(w, L) {
  const f = zvec(6);
  f[1] = 3 * w * L / 8;        // V1
  // f[2] = 0;                  // M1 = 0 (articulación)
  f[4] = 5 * w * L / 8;        // V2
  f[5] = -w * L * L / 8;       // M2
  return f;
}

// ─── Modelo del pórtico ──────────────────────────────────────────────

/**
 * Crea el modelo del pórtico a dos aguas.
 *
 * @param {Object} geo - Geometría
 * @param {number} geo.B   - Luz del pórtico [m]
 * @param {number} geo.he  - Altura de alero [m]
 * @param {number} geo.hc  - Altura de cumbrera [m]
 * @param {string} geo.tipoBase - 'articulada' | 'empotrada'
 * @param {Object} sections - Secciones
 * @param {Object} sections.columna - { A [cm²], Ix [cm⁴] }
 * @param {Object} sections.rafter  - { A [cm²], Ix [cm⁴] }
 * @param {number} E - Módulo de elasticidad [MPa = kN/m²×1e3]
 * @returns {{ nodes, elements, nDof, fixedDofs }}
 */
export function createPorticoModel(geo, sections, E_MPa) {
  const { B, he, hc, tipoBase, rotula } = geo;
  const E = E_MPa * 1e3; // MPa → kN/m² (1 MPa = 1 N/mm² = 1e3 kN/m²)

  // Nodos [x, y] en metros
  const nodes = [
    [0,     0],       // 0: base izq
    [0,     he],      // 1: alero izq
    [B / 2, hc],      // 2: cumbrera
    [B,     he],      // 3: alero der
    [B,     0],       // 4: base der
  ];

  // Conversión de secciones: cm² → m², cm⁴ → m⁴
  const Ac = sections.columna.A * 1e-4;   // cm² → m²
  const Ic = sections.columna.Ix * 1e-8;  // cm⁴ → m⁴
  const Ar = sections.rafter.A * 1e-4;
  const Ir = sections.rafter.Ix * 1e-8;

  // Elementos [nodoI, nodoJ, A_m², I_m⁴, E_kN_m²]
  const elements = [
    { ni: 0, nj: 1, A: Ac, I: Ic, E, tipo: 'columna' },
    { ni: 1, nj: 2, A: Ar, I: Ir, E, tipo: 'rafter'  },
    { ni: 2, nj: 3, A: Ar, I: Ir, E, tipo: 'rafter'  },
    { ni: 3, nj: 4, A: Ac, I: Ic, E, tipo: 'columna' },
  ];

  // Calcular largo y ángulo de cada elemento
  for (const el of elements) {
    const [xi, yi] = nodes[el.ni];
    const [xj, yj] = nodes[el.nj];
    el.L = Math.sqrt((xj - xi) ** 2 + (yj - yi) ** 2);
    el.theta = Math.atan2(yj - yi, xj - xi);
  }

  const nDof = nodes.length * 3; // 15 DOFs

  // DOFs restringidos según tipo de base
  let fixedDofs;
  if (tipoBase === 'empotrada') {
    // Nodo 0: u0,v0,θ0 → DOFs 0,1,2
    // Nodo 4: u4,v4,θ4 → DOFs 12,13,14
    fixedDofs = [0, 1, 2, 12, 13, 14];
  } else {
    // Articulada: solo u,v (no θ)
    // Nodo 0: u0,v0 → DOFs 0,1
    // Nodo 4: u4,v4 → DOFs 12,13
    fixedDofs = [0, 1, 12, 13];
  }

  return { nodes, elements, nDof, fixedDofs, E, rotula: !!rotula };
}

/**
 * Mapeo de DOFs: elemento con nodos (ni, nj) → DOFs globales [6]
 */
function elementDofs(ni, nj) {
  return [ni * 3, ni * 3 + 1, ni * 3 + 2, nj * 3, nj * 3 + 1, nj * 3 + 2];
}

// ─── Solver principal ────────────────────────────────────────────────

/**
 * Resuelve el pórtico bajo un conjunto de cargas.
 *
 * @param {Object} model - Modelo del pórtico (de createPorticoModel)
 * @param {Array} loads - Cargas por elemento:
 *   [{ elemIdx, wPerp, wAxial }]
 *   wPerp: carga distribuida perpendicular [kN/m], positiva → presión (hacia el elemento)
 *   wAxial: carga distribuida axial [kN/m], positiva → tracción
 *
 * @returns {{
 *   displacements: Float64Array,  // desplazamientos globales [15]
 *   reactions: Float64Array,      // reacciones en DOFs restringidos
 *   elementForces: Array,         // fuerzas internas por elemento
 * }}
 */
export function solveFrame(model, loads) {
  const { nodes, elements, nDof, fixedDofs } = model;
  const nEl = elements.length;

  // ─── Ensamble global ───
  const K = zeros(nDof);
  const F = zvec(nDof);

  // Almacenar matrices de transformación y FEF locales para post-proceso
  const Ts = [];
  const fefLocals = []; // fixed-end forces en coord. local por elemento

  for (let e = 0; e < nEl; e++) {
    const el = elements[e];
    const dofs = elementDofs(el.ni, el.nj);

    // Matriz de rigidez local (articulada si corresponde)
    let kl;
    if (model.rotula && e === 0)      kl = localStiffnessHingeJ(el.E, el.A, el.I, el.L);
    else if (model.rotula && e === 3) kl = localStiffnessHingeI(el.E, el.A, el.I, el.L);
    else                              kl = localStiffness(el.E, el.A, el.I, el.L);

    // Matriz de transformación
    const T = transformationMatrix(el.theta);
    Ts.push(T);

    // Rigidez en coordenadas globales
    const kg = transformToGlobal(kl, T);

    // Ensamblar en K global
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        K[dofs[i]][dofs[j]] += kg[i][j];

    // Cargas en este elemento
    const fefLocal = zvec(6);
    const elemLoads = loads.filter(ld => ld.elemIdx === e);
    for (const ld of elemLoads) {
      if (ld.wPerp) {
        let ff;
        if (model.rotula && e === 0)      ff = fixedEndForces_uniform_perp_hingeJ(ld.wPerp, el.L);
        else if (model.rotula && e === 3) ff = fixedEndForces_uniform_perp_hingeI(ld.wPerp, el.L);
        else                              ff = fixedEndForces_uniform_perp(ld.wPerp, el.L);
        for (let i = 0; i < 6; i++) fefLocal[i] += ff[i];
      }
      if (ld.wAxial) {
        const ff = fixedEndForces_uniform_axial(ld.wAxial, el.L);
        for (let i = 0; i < 6; i++) fefLocal[i] += ff[i];
      }
    }
    fefLocals.push(fefLocal);

    // Transformar FEF a global y sumar al vector de fuerzas
    const fefGlobal = transformVecToGlobal(fefLocal, T);
    for (let i = 0; i < 6; i++) F[dofs[i]] += fefGlobal[i];
  }

  // ─── Aplicar condiciones de borde (eliminación de filas/columnas) ───
  const freeDofs = [];
  const isFixed = new Set(fixedDofs);
  for (let i = 0; i < nDof; i++) {
    if (!isFixed.has(i)) freeDofs.push(i);
  }

  const nFree = freeDofs.length;
  const Kff = zeros(nFree);
  const Ff = zvec(nFree);

  for (let i = 0; i < nFree; i++) {
    Ff[i] = F[freeDofs[i]];
    for (let j = 0; j < nFree; j++) {
      Kff[i][j] = K[freeDofs[i]][freeDofs[j]];
    }
  }

  // ─── Resolver sistema reducido ───
  const Uf = solveLinear(Kff, Ff);

  // ─── Reconstruir desplazamientos completos ───
  const U = zvec(nDof);
  for (let i = 0; i < nFree; i++) U[freeDofs[i]] = Uf[i];

  // ─── Reacciones: R = K·U - F (en DOFs restringidos) ───
  const reactions = zvec(nDof);
  for (const dof of fixedDofs) {
    let r = 0;
    for (let j = 0; j < nDof; j++) r += K[dof][j] * U[j];
    r -= F[dof];
    reactions[dof] = r;
  }

  // ─── Fuerzas internas por elemento ───
  const elementForces = [];
  for (let e = 0; e < nEl; e++) {
    const el = elements[e];
    const dofs = elementDofs(el.ni, el.nj);
    const T = Ts[e];

    // Desplazamientos globales del elemento
    const dGlobal = zvec(6);
    for (let i = 0; i < 6; i++) dGlobal[i] = U[dofs[i]];

    // Desplazamientos en coord. locales
    const dLocal = transformVecToLocal(dGlobal, T);

    // Fuerzas internas locales: f = k_local · d_local - fef_local
    let kl;
    if (model.rotula && e === 0)      kl = localStiffnessHingeJ(el.E, el.A, el.I, el.L);
    else if (model.rotula && e === 3) kl = localStiffnessHingeI(el.E, el.A, el.I, el.L);
    else                              kl = localStiffness(el.E, el.A, el.I, el.L);
    const fLocal = zvec(6);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) fLocal[i] += kl[i][j] * dLocal[j];
      fLocal[i] -= fefLocals[e][i];
    }

    // Convención: fuerzas en nodo j del elemento (extremo)
    // N positivo = tracción, V positivo = corte en +y local, M positivo = antihorario
    elementForces.push({
      tipo: el.tipo,
      L: el.L,
      theta: el.theta,
      // Fuerzas en nodo inicio (i)
      Ni: -fLocal[0],  // axial (signo: tracción +)
      Vi: -fLocal[1],  // corte
      Mi: -fLocal[2],  // momento
      // Fuerzas en nodo fin (j)
      Nj: fLocal[3],
      Vj: fLocal[4],
      Mj: fLocal[5],
    });
  }

  // ─── Reacciones empaquetadas por nodo ───
  const nodeReactions = {
    node0: { Rx: reactions[0], Ry: reactions[1], Mz: reactions[2] },
    node4: { Rx: reactions[12], Ry: reactions[13], Mz: reactions[14] },
  };

  return { displacements: U, reactions, nodeReactions, elementForces };
}

// ─── Envolvente de esfuerzos máximos ─────────────────────────────────

/**
 * Calcula esfuerzos máximos absolutos por tipo de elemento (columna/rafter)
 * a partir de múltiples resultados de combinaciones de carga.
 *
 * @param {Array} allResults - Array de resultados de solveFrame
 * @returns {{ columna: { Nmax, Vmax, Mmax }, rafter: { Nmax, Vmax, Mmax } }}
 */
export function envelopeForces(allResults) {
  const env = {
    columna: { Nmax: 0, Vmax: 0, Mmax: 0 },
    rafter:  { Nmax: 0, Vmax: 0, Mmax: 0 },
  };

  for (const result of allResults) {
    for (const ef of result.elementForces) {
      const tipo = ef.tipo;
      const N = Math.max(Math.abs(ef.Ni), Math.abs(ef.Nj));
      const V = Math.max(Math.abs(ef.Vi), Math.abs(ef.Vj));
      const M = Math.max(Math.abs(ef.Mi), Math.abs(ef.Mj));

      if (N > env[tipo].Nmax) env[tipo].Nmax = N;
      if (V > env[tipo].Vmax) env[tipo].Vmax = V;
      if (M > env[tipo].Mmax) env[tipo].Mmax = M;
    }
  }

  return env;
}

/**
 * Calcula desplazamiento máximo de servicio (para verificación de flecha).
 *
 * @param {Object} model - Modelo del pórtico
 * @param {Object} result - Resultado de solveFrame (caso de servicio, sin factores)
 * @returns {{ columna: { deltaH }, rafter: { deltaV } }}
 */
export function serviceDeflections(model, result) {
  const U = result.displacements;

  // Flecha lateral columna: desplazamiento horizontal del alero respecto a la base
  // Nodo 1 (alero izq) DOF u = 3, Nodo 3 (alero der) DOF u = 9
  const deltaH_izq = Math.abs(U[3]);
  const deltaH_der = Math.abs(U[9]);
  const deltaH = Math.max(deltaH_izq, deltaH_der);

  // Flecha vertical rafter: desplazamiento vertical de la cumbrera respecto al alero
  // Nodo 2 (cumbrera) DOF v = 7, promedio aleros DOFs v = 4 y 10
  const v_cumbrera = U[7];
  const v_alero_prom = (U[4] + U[10]) / 2;
  const deltaV = Math.abs(v_cumbrera - v_alero_prom);

  return {
    columna: { deltaH },  // [m]
    rafter:  { deltaV },  // [m]
  };
}
