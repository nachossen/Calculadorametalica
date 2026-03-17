/**
 * windIntegration.js — Integración de cargas de viento CIRSOC 102
 *
 * Calcula presiones de viento para nave industrial dos aguas usando
 * los datos de velocidades y funciones de CIRSOC 102.
 *
 * Dos direcciones de viento:
 *   W1 — Normal a cumbrera (perpendicular al eje longitudinal)
 *   W2 — Paralelo a cumbrera (paralelo al eje longitudinal)
 *
 * Presiones netas = qh × G × Cp_ext − qh × GCpi  (Ec. 2.4-1 CIRSOC 102)
 *   G    = 0.85  (factor de ráfaga, estructura rígida T < 1s)
 *   GCpi = ±0.18 (presión interna, edificio cerrado — Tabla 2.5-1)
 *   Para cada superficie se toma la combinación GCpi que maximiza la carga.
 *
 * Devuelve presiones LRFD (V700 — resistencia) y de servicio (V50 — flechas).
 */

import { VELOCIDADES_ARG, CAT_RIESGO } from '../../data/velocidades.js';
import { calcQz, calcKz, calcKe } from '../../core/wind.js';
import { getCp } from '../../roofTypes/dosAguas/cp.js';

export const LOCALIDADES = Object.keys(VELOCIDADES_ARG);

/** Factor de ráfaga — estructura rígida (T < 1s) */
const G = 0.85;

/** GCpi por tipo de cerramiento (Tabla 2.5-1 CIRSOC 102) */
export const GCPI_POR_TIPO = {
  cerrado:              0.18,
  parcialmente_cerrado: 0.55,
  parcialmente_abierto: 0.18,
  abierto:              0.00,
};

/**
 * Calcula presiones de viento para nave industrial dos aguas.
 *
 * @param {Object} p
 * @param {string} p.localidad   - Nombre de ciudad (key de VELOCIDADES_ARG)
 * @param {string} p.riesgo      - Categoría de riesgo: 'I' | 'II' | 'III' | 'IV'
 * @param {string} p.exposicion  - Categoría de exposición: 'B' | 'C' | 'D'
 * @param {number} p.altitud     - Altitud en m.s.n.m.
 * @param {number} p.theta_deg   - Ángulo de faldón [°]
 * @param {number} p.he          - Altura de alero [m]
 * @param {number} p.hc          - Altura de cumbrera [m]
 * @param {number} p.B           - Ancho de nave (luz del pórtico) [m]
 * @param {number} p.L           - Largo de nave (dirección longitudinal) [m]
 * @param {number} [p.Kzt]       - Factor de topografía (default 1.0 — terreno plano)
 * @returns {Object} Velocidades, presiones dinámicas y presiones netas en kN/m²
 */
export function computeWindLoads({ localidad, riesgo, exposicion, altitud, theta_deg, he, hc, B, L, Kzt: KztParam, enclosure = 'cerrado' }) {
  const GCPI = GCPI_POR_TIPO[enclosure] ?? 0.18;

  /** Presión neta envolvente para una superficie: Ec. 2.4-1 */
  function pNet(qh, cp) {
    const ext = qh * G * cp;
    const withPos = ext - qh *  GCPI;
    const withNeg = ext - qh * -GCPI;
    return Math.abs(withPos) >= Math.abs(withNeg) ? withPos : withNeg;
  }
  const entry = VELOCIDADES_ARG[localidad];
  const col   = CAT_RIESGO[riesgo]?.col ?? 'V700';
  const V     = entry?.[col] ?? 45;

  // V50 de servicio = V₅₀_CIRSOC2005 = V700 / √1.5  (CIRSOC 102-2025 fórmula C 1.5-6.1, MRI 50 años)
  const V_base    = entry?.V700 ?? entry?.V300 ?? V;
  const V_service = +(V_base / Math.sqrt(1.5)).toFixed(1);

  // Kz evaluado en la altura de alero he (altura de referencia para nave industrial)
  const Kz  = calcKz(he, exposicion);
  const Ke  = calcKe(altitud ?? 0);
  const Kd  = 0.85;
  const Kzt = KztParam ?? 1.0;

  const qh         = calcQz(Kz, Kzt, Kd, Ke, V)         / 1000;
  const qh_service = calcQz(Kz, Kzt, Kd, Ke, V_service) / 1000;

  // ── Cp interpolados de CIRSOC 102 ──────────────────────────────────────────
  // h/L usa la altura media de cubierta h = (he + hc) / 2 (Fig. 2.4-1 CIRSOC 102)
  // Para W1 (viento ⊥ cumbrera): dimensión de referencia = B (ancho del pórtico)
  // Para W2 (viento ∥ cumbrera): dimensión de referencia = min(B, L)
  const h_mean     = hc != null ? (he + hc) / 2 : he;
  const hOverL_W1  = h_mean / B;
  const hOverL_W2  = h_mean / Math.min(B, L);

  // W1: viento normal a cumbrera
  const LB_W1 = L / B;
  const cpW1  = getCp(theta_deg, hOverL_W1, true,  LB_W1);

  // W2: viento paralelo a cumbrera
  const LB_W2 = B / L;
  const cpW2  = getCp(theta_deg, hOverL_W2, false, LB_W2);

  // ── Presiones netas W1 (Ec. 2.4-1: qh × G × Cp − qh × GCpi) ───────────────
  // Cp puros de Fig. 2.4-1 → aplicar G=0.85 y GCpi=±0.18 (peor caso por superficie)
  const cp_W1_col_bv = cpW1.cpWW;           // +0.80 barlovento pared
  const cp_W1_col_sv = cpW1.cpLW;           // negativo sotavento pared
  const cp_W1_raf_bv = cpW1.cpRBV.min;     // succión dominante cubierta BV
  const cp_W1_raf_sv = cpW1.cpRSV;         // succión cubierta SV

  const pressures_W1 = {
    W_barlovento_col: +pNet(qh, cp_W1_col_bv).toFixed(4),
    W_sotavento_col:  +pNet(qh, cp_W1_col_sv).toFixed(4),
    W_barlovento_raf: +pNet(qh, cp_W1_raf_bv).toFixed(4),
    W_sotavento_raf:  +pNet(qh, cp_W1_raf_sv).toFixed(4),
  };

  const pressures_W1_service = {
    W_barlovento_col: +pNet(qh_service, cp_W1_col_bv).toFixed(4),
    W_sotavento_col:  +pNet(qh_service, cp_W1_col_sv).toFixed(4),
    W_barlovento_raf: +pNet(qh_service, cp_W1_raf_bv).toFixed(4),
    W_sotavento_raf:  +pNet(qh_service, cp_W1_raf_sv).toFixed(4),
  };

  // ── Presiones netas W2 (paralelo a cumbrera) ────────────────────────────────
  const cp_W2_col = cpW2.cpLat;       // succión paredes laterales
  const cp_W2_raf = cpW2.cpRBV.min;  // succión cubierta paralela

  const pressures_W2 = {
    W_col: +pNet(qh, cp_W2_col).toFixed(4),
    W_raf: +pNet(qh, cp_W2_raf).toFixed(4),
  };

  const pressures_W2_service = {
    W_col: +pNet(qh_service, cp_W2_col).toFixed(4),
    W_raf: +pNet(qh_service, cp_W2_raf).toFixed(4),
  };

  // ── Compatibilidad: pressures/pressures_service apuntan a W1 ────────────────
  const pressures         = pressures_W1;
  const pressures_service = pressures_W1_service;

  return {
    V,
    V_service: +V_service.toFixed(1),
    G,
    GCpi: GCPI,
    Kz:  +Kz.toFixed(4),
    Ke:  +Ke.toFixed(4),
    Kzt,
    Kd,
    qh:         +qh.toFixed(4),
    qh_service: +qh_service.toFixed(4),
    pressures,
    pressures_service,
    pressures_W1,
    pressures_W1_service,
    pressures_W2,
    pressures_W2_service,
    // Cp puros (sin G ni GCpi) — para mostrar en Memoria
    cp_W1: { col_bv: cp_W1_col_bv, col_sv: cp_W1_col_sv, raf_bv: cp_W1_raf_bv, raf_sv: cp_W1_raf_sv },
    cp_W2: { col: cp_W2_col, raf: cp_W2_raf },
  };
}
