/**
 * methods/direccional.js — Procedimiento Direccional Cap. 2 (orquestador)
 * Implementa el pipeline completo: datos → geometría → perfil → ráfaga → Cp → presiones → pórtico
 */

import { calcKz, calcKe, calcQz, buildQzProfile } from '../core/wind.js';
import { calcKzt } from '../core/topography.js';
import { calcG_rigid, selectG } from '../core/gust.js';
import { calcN1 } from '../core/frequency.js';
import { calcPressure } from '../core/pressure.js';
import { getKd } from '../data/kd.js';
import { getGCpi } from '../data/gcpi.js';
import { getRoofType, normalizeRoofTypeId } from '../roofTypes/registry.js';

/**
 * Ejecuta el cálculo direccional completo.
 * @param {Object} inp — Inputs del usuario
 * @returns {Object} Resultado completo con todos los valores intermedios y finales
 */
export function runDireccional(inp) {
  const {
    V, exposure: exp, altitude,
    B, L, he, hc,
    structKey, structSystem,
    windAngle, enclosure, porticos,
    topoType, H_hill, Lh, x_dist, topoSide,
    supportType,
  } = inp;

  // 1. Parámetros base
  const Kd = getKd(structKey);
  const Ke = calcKe(altitude);
  const roofTypeId = normalizeRoofTypeId(inp.roofType);
  const roofType = getRoofType(roofTypeId);

  // 2. Geometría — delegada a la tipología
  const geo = roofType.calcGeometry(inp);
  const { h, theta, Beff, Leff, LB, hOverL, isNorm, is1agua, wl } = geo;

  // 3. Factor topográfico
  const kztResult = calcKzt(topoType, H_hill, Lh, x_dist, h, topoSide, exp);
  const Kzt = kztResult.Kzt;

  // 4. Perfil qz y qh
  const Kz_h = calcKz(h, exp);
  const qh = calcQz(Kz_h, Kzt, Kd, Ke, V);

  // 5. Factor de ráfaga
  const n1 = calcN1(h, structSystem);
  const isRigid = n1 >= 1.0;
  const gRes = calcG_rigid(h, exp, Beff, h);
  const G = selectG(isRigid, gRes);

  // 6. GCpi
  const gcpi = getGCpi(enclosure);

  // 7. Cp — delegado a la tipología
  const cpResult = roofType.getCp(theta, hOverL, isNorm, LB);
  const { cpWW, cpLW, cpLat, cpRBV, cpRSV, roofMode } = cpResult;

  // 8. Presiones — Ec. 2.4-1: p = q × G × Cp − qh × (±GCpi)
  const calcP = (cp, q = qh) => calcPressure(cp, q, qh, G, gcpi);

  const pWW     = calcP(cpWW);
  const pLW     = calcP(cpLW);
  const pLat    = calcP(cpLat);
  const pRBVmax = calcP(typeof cpRBV === 'object' ? cpRBV.max : cpRBV);
  const pRBVmin = calcP(typeof cpRBV === 'object' ? cpRBV.min : cpRBV);
  const pRSV    = calcP(typeof cpRSV === 'number' ? cpRSV : (cpRSV?.min ?? -0.9));

  const pressures = { pWW, pLW, pLat, pRBVmax, pRBVmin, pRSV };

  // 9. Fuerzas en pórtico — delegado a la tipología
  const sep = porticos > 1 ? L / (porticos - 1) : L;
  const frameForces = roofType.calcFrameForces(pressures, { ...geo, he, B, L }, sep, supportType);

  // 10. Perfil qz para gráfico
  const qzProf = buildQzProfile({ hc, exposure: exp, Kzt, Kd, Ke, V });

  return {
    // Geometría
    h, theta, Beff, Leff, LB, hOverL, isNorm, is1agua, wl, roofMode,
    ro: geo.ro,
    // Factores (G primero desde gRes, luego sobreescrito con valor selectG)
    Kd, Ke, Kz_h, Kzt, qh,
    ...gRes, // Iz, Lz, Q, Q2, z_bar, gq (y G_raw = calcG_rigid)
    G,       // selectG(isRigid, gRes) — sobreescribe gRes.G con valor definitivo
    n1, isRigid,
    ...kztResult, // K1, K2, K3, HLh, xLh, zLh
    // Cerramiento
    enclosure, gcpi,
    // Coeficientes de presión
    cpWW, cpLW, cpLat, cpRBV, cpRSV,
    // Presiones [Pa]
    pWW, pLW, pLat, pRBVmax, pRBVmin, pRSV,
    // Pórtico
    frameForces,
    // Perfil qz
    qzProf,
    // Passthrough de inputs para la UI y la memoria de cálculo
    V, exp, altitude,
    B, L, he, hc,
    structKey, structSystem,
    windAngle: ((windAngle % 360) + 360) % 360,
    porticos, topoType, H_hill, Lh, x_dist, topoSide,
    roofType: roofTypeId,
    // Aberturas para visualización 3D
    openings: inp.openings || {},
  };
}
