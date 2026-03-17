/**
 * loadCases.js — Generación de casos de carga y combinaciones LRFD
 * para pórtico a dos aguas.
 *
 * Convierte cargas superficiales [kN/m²] a cargas lineales [kN/m] por
 * separación de pórticos, y las aplica como cargas distribuidas sobre
 * los elementos del modelo (perpendiculares y axiales en coord. locales).
 *
 * Direcciones de viento:
 *   W1 — Normal a cumbrera (→ o ←) con barlovento/sotavento diferenciados
 *   W2 — Paralelo a cumbrera: succión simétrica en faldones y paredes laterales
 */

/**
 * Genera las cargas del pórtico para un caso dado.
 *
 * El modelo tiene 4 elementos:
 *   0: columna izq (vertical, 0→1)
 *   1: rafter izq  (1→2, inclinado)
 *   2: rafter der  (2→3, inclinado)
 *   3: columna der (vertical, 3→4)
 *
 * @param {Object} params
 * @param {number} params.sep     - Separación entre pórticos [m]
 * @param {number} params.theta   - Ángulo de faldón [rad]
 * @param {Object} params.cargas  - Cargas superficiales por caso
 * @param {string} params.caso    - 'D' | 'Lr' | 'W1_izq' | 'W1_der' | 'W2'
 * @returns {Array} loads para solveFrame: [{ elemIdx, wPerp, wAxial }]
 */
export function generateLoads(params) {
  const { sep, theta, cargas, caso } = params;

  switch (caso) {
    case 'D':       return loadsDead(sep, theta, cargas);
    case 'Lr':      return loadsRoofLive(sep, theta, cargas);
    case 'W1_izq':  return loadsWindW1(sep, cargas, 'izq');
    case 'W1_der':  return loadsWindW1(sep, cargas, 'der');
    case 'W2':      return loadsWindW2(sep, cargas);
    // Compatibilidad con código que use los nombres viejos
    case 'W_izq':   return loadsWindW1(sep, cargas, 'izq');
    case 'W_der':   return loadsWindW1(sep, cargas, 'der');
    default: return [];
  }
}

/**
 * Carga muerta (D): actúa sobre faldones como carga gravitatoria.
 * Se proyecta al eje del rafter (perpendicular + axial).
 */
function loadsDead(sep, theta, cargas) {
  const w = cargas.D * sep; // kN/m sobre faldón (por longitud de rafter)
  const cosT = Math.cos(theta);

  return [
    // Rafter izq/der: componente perpendicular de carga gravitatoria
    { elemIdx: 1, wPerp: -w * cosT },
    { elemIdx: 2, wPerp: -w * cosT },
    // Columnas: carga muerta de pared (chapas + correas)
    { elemIdx: 0, wAxial: -w },
    { elemIdx: 3, wAxial: -w },
  ];
}

/**
 * Sobrecarga de techo (Lr): misma distribución que D.
 */
function loadsRoofLive(sep, theta, cargas) {
  const w = cargas.Lr * sep;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  return [
    { elemIdx: 1, wPerp: -w * cosT, wAxial: -w * sinT },
    { elemIdx: 2, wPerp: -w * cosT, wAxial: w * sinT },
  ];
}

/**
 * Viento W1 — Normal a cumbrera (perpendicular al eje longitudinal).
 *
 * Las presiones de viento Cp son normales a la superficie por definición.
 * Para columnas (verticales), wPerp es horizontal → correcto.
 * Para rafters (inclinados), wPerp es perpendicular al faldón = normal a
 * la superficie → NO requiere proyección adicional (a diferencia de D y Lr
 * que son gravitatorias y SÍ se proyectan con cos/sin θ).
 *
 * @param {string} dir - 'izq' (viento de izq→der) | 'der' (viento de der→izq)
 */
function loadsWindW1(sep, cargas, dir) {
  const loads = [];

  // Presiones W1 en kN/m² → kN/m multiplicando por sep
  const wBvCol = (cargas.W_barlovento_col || 0) * sep;
  const wSvCol = (cargas.W_sotavento_col  || 0) * sep;
  const wBvRaf = (cargas.W_barlovento_raf || 0) * sep;
  const wSvRaf = (cargas.W_sotavento_raf  || 0) * sep;

  if (dir === 'izq') {
    // Viento de izquierda a derecha
    // +v local de elem 0 (col izq) apunta a IZQUIERDA, pero presión barlovento va a DERECHA → negar
    loads.push({ elemIdx: 0, wPerp: -wBvCol });   // col izq = barlovento
    loads.push({ elemIdx: 3, wPerp: -wSvCol });   // col der = sotavento
    loads.push({ elemIdx: 1, wPerp: -wBvRaf });   // rafter izq = barlovento
    loads.push({ elemIdx: 2, wPerp: -wSvRaf });   // rafter der = sotavento
  } else {
    // Viento de derecha a izquierda (simétrico invertido)
    loads.push({ elemIdx: 3, wPerp: -wBvCol });  // col der = barlovento (signo invertido por orientación)
    loads.push({ elemIdx: 0, wPerp: -wSvCol });  // col izq = sotavento
    loads.push({ elemIdx: 2, wPerp: -wBvRaf });  // rafter der = barlovento
    loads.push({ elemIdx: 1, wPerp: -wSvRaf });  // rafter izq = sotavento
  }

  return loads;
}

/**
 * Viento W2 — Paralelo a cumbrera (paralelo al eje longitudinal).
 *
 * En esta dirección, el viento sopla paralelo a la cumbrera:
 *   - Las paredes del pórtico (columnas) son paredes laterales → succión (CP_LAT)
 *     en ambas caras, simétrica → las presiones se cancelan en el modelo 2D
 *     PERO cada columna recibe la succión individualmente.
 *   - Ambos faldones reciben succión uniforme (no hay barlovento/sotavento en techo).
 *
 * Para el modelo 2D: las columnas reciben succión hacia afuera (en direcciones
 * opuestas), lo que genera tracción axial en los rafters.
 */
function loadsWindW2(sep, cargas) {
  // W2 usa presiones específicas de viento paralelo
  const wCol = (cargas.W2_col || 0) * sep;
  const wRaf = (cargas.W2_raf || 0) * sep;

  return [
    // Columna izq: succión hacia afuera (= hacia -x global). +v local apunta IZQ = -x → succión = +v
    // Pero wCol ya es NEGATIVO (succión de CIRSOC 102), así que -wCol = positivo = +v = hacia izq ✓
    { elemIdx: 0, wPerp: -wCol },
    // Columna der: succión hacia afuera (= hacia +x global). +v local de elem 3 apunta DER = +x
    // -wCol = positivo = +v = hacia derecha ✓
    { elemIdx: 3, wPerp: -wCol },
    // Rafter izq: succión perpendicular al faldón, hacia afuera (arriba)
    // wRaf es NEGATIVO (succión), -wRaf = positivo = +v local = afuera ✓
    { elemIdx: 1, wPerp: -wRaf },
    // Rafter der: succión uniforme
    { elemIdx: 2, wPerp: -wRaf },
  ];
}

/**
 * Genera cargas de peso propio del pórtico.
 *
 * @param {number} sep     - Separación entre pórticos [m] (no usado, PP es por metro lineal)
 * @param {number} theta   - Ángulo de faldón [rad]
 * @param {Object} perfilCol - Perfil de columna con .peso [kg/m]
 * @param {Object} perfilRaf - Perfil de rafter con .peso [kg/m]
 * @returns {Array} loads para solveFrame
 */
export function generateSelfWeightLoads(theta, perfilCol, perfilRaf) {
  // Peso lineal [kg/m] → [kN/m]
  const wCol = perfilCol.peso * 9.81 / 1000;
  const wRaf = perfilRaf.peso * 9.81 / 1000;

  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  return [
    // Columnas: carga axial descendente (peso propio actúa en -y global = axial en elem vertical)
    { elemIdx: 0, wAxial: -wCol },
    { elemIdx: 3, wAxial: -wCol },
    // Rafters: solo componente perpendicular del peso propio
    { elemIdx: 1, wPerp: -wRaf * cosT },
    { elemIdx: 2, wPerp: -wRaf * cosT },
  ];
}

// ─── Combinaciones LRFD ──────────────────────────────────────────────

/**
 * Combinaciones LRFD según CIRSOC 301-2018 / ASCE 7.
 *
 * W1 = viento normal a cumbrera (→ y ←)
 * W2 = viento paralelo a cumbrera
 */
export const COMBINACIONES_LRFD = [
  { id: 'C1',      nombre: '1.4D',                factores: { D: 1.4, Lr: 0,   W: 0   } },
  { id: 'C2',      nombre: '1.2D + 1.6Lr',        factores: { D: 1.2, Lr: 1.6, W: 0   } },
  { id: 'C3',      nombre: '1.2D + 1.0W + 0.5Lr', factores: { D: 1.2, Lr: 0.5, W: 1.0 } },
  { id: 'C4',      nombre: '0.9D + 1.0W',          factores: { D: 0.9, Lr: 0,   W: 1.0 } },
];

/**
 * Genera todas las cargas combinadas para cada combinación LRFD.
 * Incluye W1→, W1←, y W2 para las combinaciones con viento.
 *
 * @param {Object} params
 * @param {number} params.sep
 * @param {number} params.theta
 * @param {Object} params.cargas - { D, Lr, W_barlovento_col, ..., W2_col, W2_raf, ... }
 * @param {Array}  [params.selfWeightLoads] - Cargas de peso propio (si hay)
 * @returns {Array} [{ id, nombre, loads }] donde loads es array para solveFrame
 */
export function generateAllCombinations(params) {
  const { sep, theta, cargas, selfWeightLoads } = params;

  // Generar cargas base (sin factores)
  const baseD  = generateLoads({ sep, theta, cargas, caso: 'D' });
  const baseLr = generateLoads({ sep, theta, cargas, caso: 'Lr' });

  // Si hay peso propio, sumarlo a las cargas D
  const baseLoads_D = selfWeightLoads ? mergeLoads(baseD, selfWeightLoads) : baseD;

  // Tres variantes de viento
  const baseW1izq = generateLoads({ sep, theta, cargas, caso: 'W1_izq' });
  const baseW1der = generateLoads({ sep, theta, cargas, caso: 'W1_der' });
  const baseW2    = generateLoads({ sep, theta, cargas, caso: 'W2' });

  const windVariants = [
    { suffix: '',      label: ' (W1→)', loads: baseW1izq },
    { suffix: '_W1d',  label: ' (W1←)', loads: baseW1der },
    { suffix: '_W2',   label: ' (W2)',  loads: baseW2 },
  ];

  const baseLoads = {
    D:  baseLoads_D,
    Lr: baseLr,
  };

  const results = [];

  for (const comb of COMBINACIONES_LRFD) {
    const { factores } = comb;

    if (factores.W === 0) {
      // Combinaciones sin viento (C1, C2): una sola variante
      const loads = combineLoads(baseLoads, factores, null);
      results.push({ id: comb.id, nombre: comb.nombre, loads, group: 'elu' });
    } else {
      // Combinaciones con viento: generar una variante por cada dirección
      for (const wv of windVariants) {
        const loads = combineLoads(baseLoads, factores, { loads: wv.loads, factor: factores.W });
        results.push({
          id: comb.id + wv.suffix,
          nombre: comb.nombre + wv.label,
          loads,
          group: 'elu',
        });
      }
    }
  }

  return results;
}

/**
 * Combina cargas base factoradas en un solo set de loads por elemento.
 */
function combineLoads(baseLoads, factores, windOverride) {
  const elemMap = {};

  for (const [caso, factor] of Object.entries(factores)) {
    if (factor === 0 || caso === 'W') continue;
    const loads = baseLoads[caso];
    if (!loads) continue;

    for (const ld of loads) {
      if (!elemMap[ld.elemIdx]) elemMap[ld.elemIdx] = { wPerp: 0, wAxial: 0 };
      elemMap[ld.elemIdx].wPerp  += (ld.wPerp  || 0) * factor;
      elemMap[ld.elemIdx].wAxial += (ld.wAxial || 0) * factor;
    }
  }

  // Agregar viento si corresponde
  if (windOverride) {
    for (const ld of windOverride.loads) {
      if (!elemMap[ld.elemIdx]) elemMap[ld.elemIdx] = { wPerp: 0, wAxial: 0 };
      elemMap[ld.elemIdx].wPerp  += (ld.wPerp  || 0) * windOverride.factor;
      elemMap[ld.elemIdx].wAxial += (ld.wAxial || 0) * windOverride.factor;
    }
  }

  const combinedLoads = [];
  for (const [idx, vals] of Object.entries(elemMap)) {
    combinedLoads.push({ elemIdx: parseInt(idx), wPerp: vals.wPerp, wAxial: vals.wAxial });
  }
  return combinedLoads;
}

/**
 * Suma dos arrays de loads por elemento (merge).
 */
export function mergeLoads(loadsA, loadsB) {
  const map = {};
  for (const ld of loadsA) {
    if (!map[ld.elemIdx]) map[ld.elemIdx] = { wPerp: 0, wAxial: 0 };
    map[ld.elemIdx].wPerp  += ld.wPerp  || 0;
    map[ld.elemIdx].wAxial += ld.wAxial || 0;
  }
  for (const ld of loadsB) {
    if (!map[ld.elemIdx]) map[ld.elemIdx] = { wPerp: 0, wAxial: 0 };
    map[ld.elemIdx].wPerp  += ld.wPerp  || 0;
    map[ld.elemIdx].wAxial += ld.wAxial || 0;
  }
  return Object.entries(map).map(([idx, vals]) => ({
    elemIdx: parseInt(idx), wPerp: vals.wPerp, wAxial: vals.wAxial,
  }));
}

/**
 * Reemplaza las claves de presión de viento en cargas por sus equivalentes de servicio (_service).
 * Usado internamente para generar combinaciones ELS con V50.
 */
function toServiceCargas(cargas) {
  if (cargas.W_barlovento_col_service == null) return cargas;
  return {
    ...cargas,
    W_barlovento_col: cargas.W_barlovento_col_service,
    W_sotavento_col:  cargas.W_sotavento_col_service,
    W_barlovento_raf: cargas.W_barlovento_raf_service,
    W_sotavento_raf:  cargas.W_sotavento_raf_service,
    W2_col: cargas.W2_col_service ?? cargas.W2_col,
    W2_raf: cargas.W2_raf_service ?? cargas.W2_raf,
  };
}

/**
 * Genera combinaciones de servicio (ELS) para verificación de flecha.
 * Usa presiones de viento de servicio (V50, _service keys).
 *
 * S1       : D + Lr            (gravitatorio)
 * S2_W1i   : D + Ws (W1→)     (viento servicio derecha)
 * S2_W1d   : D + Ws (W1←)     (viento servicio izquierda)
 * S2_W2    : D + Ws (W2)       (viento servicio paralelo)
 *
 * @returns {Array} [{ id, nombre, group:'els', loads }]
 */
export function generateServiceCombinations({ sep, theta, cargas, selfWeightLoads }) {
  const sCar  = toServiceCargas(cargas);
  const baseD = mergeLoads(generateLoads({ sep, theta, cargas, caso: 'D' }), selfWeightLoads || []);
  const sW1i  = generateLoads({ sep, theta, cargas: sCar, caso: 'W1_izq' });
  const sW1d  = generateLoads({ sep, theta, cargas: sCar, caso: 'W1_der' });
  const sW2   = generateLoads({ sep, theta, cargas: sCar, caso: 'W2' });
  const DpLr  = mergeLoads(baseD, generateLoads({ sep, theta, cargas, caso: 'Lr' }));

  return [
    { id: 'S1',     nombre: 'D + Lr',        group: 'els', loads: DpLr },
    { id: 'S2_W1i', nombre: 'D + Ws (W1→)',  group: 'els', loads: mergeLoads(baseD, sW1i) },
    { id: 'S2_W1d', nombre: 'D + Ws (W1←)',  group: 'els', loads: mergeLoads(baseD, sW1d) },
    { id: 'S2_W2',  nombre: 'D + Ws (W2)',    group: 'els', loads: mergeLoads(baseD, sW2)  },
  ];
}

/**
 * Genera casos básicos individuales (sin factor) para visualización.
 * No se usan en el diseño; sólo para entender la contribución de cada acción.
 *
 * @returns {Array} [{ id, nombre, group:'basic', loads }]
 */
export function generateBasicCases({ sep, theta, cargas, selfWeightLoads }) {
  const baseD   = mergeLoads(generateLoads({ sep, theta, cargas, caso: 'D' }), selfWeightLoads || []);
  const baseLr  = generateLoads({ sep, theta, cargas, caso: 'Lr' });
  const baseW1i = generateLoads({ sep, theta, cargas, caso: 'W1_izq' });
  const baseW1d = generateLoads({ sep, theta, cargas, caso: 'W1_der' });
  const baseW2  = generateLoads({ sep, theta, cargas, caso: 'W2' });

  return [
    { id: 'B_D',   nombre: 'D (solo)',    group: 'basic', loads: baseD   },
    { id: 'B_Lr',  nombre: 'Lr (solo)',   group: 'basic', loads: baseLr  },
    { id: 'B_W1i', nombre: 'W1→ (solo)',  group: 'basic', loads: baseW1i },
    { id: 'B_W1d', nombre: 'W1← (solo)', group: 'basic', loads: baseW1d },
    { id: 'B_W2',  nombre: 'W2 (solo)',   group: 'basic', loads: baseW2  },
  ];
}

/**
 * Genera cargas de servicio (sin factores) para verificación de flecha.
 *
 * Para la deriva lateral (H/150) se usan las presiones de viento de servicio
 * (V300, 300 años MRI) si están disponibles.
 */
export function generateServiceLoads(params) {
  const { sep, theta, cargas } = params;

  // Usar presiones de servicio (V300) para deriva si están disponibles
  const cargasW = cargas.W_barlovento_col_service != null ? {
    ...cargas,
    W_barlovento_col: cargas.W_barlovento_col_service,
    W_sotavento_col:  cargas.W_sotavento_col_service,
    W_barlovento_raf: cargas.W_barlovento_raf_service,
    W_sotavento_raf:  cargas.W_sotavento_raf_service,
  } : cargas;

  return {
    DplusLr: [
      ...generateLoads({ sep, theta, cargas, caso: 'D' }),
      ...generateLoads({ sep, theta, cargas, caso: 'Lr' }),
    ],
    W: generateLoads({ sep, theta, cargas: cargasW, caso: 'W1_izq' }),
  };
}
