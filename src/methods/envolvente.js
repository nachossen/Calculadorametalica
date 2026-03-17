/**
 * methods/envolvente.js — Método Envolvente Apéndice C
 * p = qh × [(GCpf) − (GCpi)]   Ec. C.3-1
 * Aplicable a edificios bajos: h ≤ 20 m
 */

import { calcKz, calcQz } from '../core/wind.js';
import { lerp } from '../core/utils.js';
import { getGCpi } from '../data/gcpi.js';
import {
  GCPF_C1, GCPF_C2, GCPF_C3, GCPF_C4,
  ENV_ZONES_C1, ENV_ZONES_C2, ENV_ZONES_C3, ENV_ZONES_C4,
} from '../data/envolventeGCpf.js';

function interpGCpf(table, theta, zone) {
  if (theta <= table[0].t) return table[0].s[zone];
  if (theta >= table[table.length - 1].t) return table[table.length - 1].s[zone];
  for (let i = 0; i < table.length - 1; i++) {
    if (theta >= table[i].t && theta <= table[i + 1].t) {
      return lerp(theta, table[i].t, table[i + 1].t, table[i].s[zone], table[i + 1].s[zone]);
    }
  }
  return table[table.length - 1].s[zone];
}

/**
 * Ejecuta el método envolvente (Ap. C).
 * @param {Object} inp — Inputs del usuario
 * @param {Object} dirRes — Resultado del método direccional (para reutilizar Kzt, Kd, Ke)
 * @returns {Object}
 */
export function runEnvolvente(inp, dirRes) {
  const { B, L, he, hc, exposure: exp, enclosure } = inp;
  const h = dirRes.h;
  const theta = dirRes.theta;

  // Aplicabilidad: h ≤ 20 m
  const hRef = theta <= 10 ? he : h;
  const isApplicable = hRef <= 20;
  const minDim = Math.min(B, L);

  // Dimensión "a" — Notación Fig. AC.3-1
  let a = Math.min(0.1 * minDim, 0.4 * hRef);
  a = Math.max(a, 0.04 * minDim, 1.0);
  if (theta <= 7 && minDim > 90) a = Math.min(a, 0.8 * hRef);

  // Kz para envolvente: C.2.1 → Kz o 0.70 mínimo para h<30m Exp.B
  const Kz_env = (exp === 'B' && hRef < 30) ? Math.max(calcKz(hRef, exp), 0.70) : calcKz(hRef, exp);
  const qh = calcQz(Kz_env, dirRes.Kzt, dirRes.Kd, dirRes.Ke, inp.V);

  const gcpi = getGCpi(enclosure);

  const calcZoneP = gcpf => ({
    gcpf,
    pPos: qh * (gcpf - gcpi.n),
    pNeg: qh * (gcpf - gcpi.p),
  });

  // Caso 1: Transversal
  const c1 = {};
  ENV_ZONES_C1.forEach(z => { c1[z] = calcZoneP(interpGCpf(GCPF_C1, theta, z)); });

  // Caso 2: Longitudinal (constante)
  const c2 = {};
  ENV_ZONES_C2.forEach(z => { c2[z] = calcZoneP(GCPF_C2[z]); });

  // Caso 3: Torsional transversal
  const c3 = {};
  ENV_ZONES_C3.forEach(z => { c3[z] = calcZoneP(interpGCpf(GCPF_C3, theta, z)); });

  // Caso 4: Torsional longitudinal
  const c4 = {};
  ENV_ZONES_C4.forEach(z => { c4[z] = calcZoneP(GCPF_C4[z]); });

  const envMax = {
    wallBV: Math.max(Math.abs(c1['1'].pPos), Math.abs(c1['1'].pNeg), Math.abs(c2['5']?.pPos || 0), Math.abs(c2['5']?.pNeg || 0)),
    wallSV: Math.max(Math.abs(c1['4'].pPos), Math.abs(c1['4'].pNeg), Math.abs(c2['4']?.pPos || 0), Math.abs(c2['4']?.pNeg || 0)),
    roofBV: Math.max(Math.abs(c1['2'].pPos), Math.abs(c1['2'].pNeg), Math.abs(c2['2']?.pPos || 0), Math.abs(c2['2']?.pNeg || 0)),
    roofSV: Math.max(Math.abs(c1['3'].pPos), Math.abs(c1['3'].pNeg), Math.abs(c2['3']?.pPos || 0), Math.abs(c2['3']?.pNeg || 0)),
  };

  return {
    isApplicable, hRef, a, Kz_env, qh, gcpi, c1, c2, c3, c4, theta, envMax,
    // Factores para memoria de cálculo
    Kd: dirRes.Kd, Ke: dirRes.Ke, Kzt: dirRes.Kzt, V: inp.V,
    B, L, he, hc, exp,
  };
}
