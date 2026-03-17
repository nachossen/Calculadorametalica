/**
 * correaDesign.js — Verificación preliminar de correas (perfiles C conformados)
 *
 * Bajo CARGA GRAVITATORIA (D + Lr):
 *   - El ala superior (comprimida) queda arriostrada por el chapeado → sin pandeo lateral
 *   - φMn = 0.90 × Fy × Sx / 1e3  (capacidad completa, sin reducción LTB)
 *   - Flecha límite: L/240 (servicio D + Lr)
 *
 * Bajo SUCCIÓN DE VIENTO (0.9D + 1.0W):
 *   - El ala inferior pasa a estar comprimida → pandeo lateral depende del arriostramiento
 *   - Opciones de 'bridging': 'cladding' | 'half' | 'third' | 'none'
 *   - Para 'half' y 'third', las tirillas (bridging rods) arriostrán el ala inferior
 *   - Reducción LTB estimada por método simplificado basado en esbeltez efectiva
 *
 * Referencia: AISI S100-16 / CIRSOC 303-2005 Sec. C3 (LTB)
 */

const E_acero = 200_000; // MPa

/**
 * Calcula el factor de reducción por pandeo lateral-torsional (LTB)
 * para el ala inferior comprimida (caso de succión/viento).
 *
 * Aproximación conservadora basada en esbeltez de pandeo flexotorsional
 * usando solo Iy y dimensiones de sección.
 *
 * @param {Object} correa - Perfil con propiedades Iy, Fy, h, b, t
 * @param {number} Lb_mm  - Longitud no arriostrada del ala inferior [mm]
 * @returns {number} Factor de reducción (0 a 1)
 */
function ltbReductionFactor(correa, Lb_mm) {
  // Sin propiedades suficientes: usar valor conservador
  if (!correa.Iy || !correa.h || !correa.b || !correa.t) return 0.60;
  if (Lb_mm <= 0) return 1.0;

  // Área aproximada de la sección C [mm²]
  const a_lip = correa.a || correa.b * 0.3; // lip length (approx if not given)
  const A_mm2 = correa.t * (correa.h + 2 * correa.b + 2 * a_lip);

  // Radio de giro eje débil [mm]
  const Iy_mm4 = correa.Iy * 1e4; // cm⁴ → mm⁴
  const ry_mm = Math.sqrt(Iy_mm4 / A_mm2);
  if (ry_mm <= 0) return 0.60;

  // Esbeltez normalizada (enfoque simplificado AISI-like, Euler para LTB)
  const Fe = (Math.PI ** 2 * E_acero) / (Lb_mm / ry_mm) ** 2; // MPa
  const lambda_c = Math.sqrt(correa.Fy / Fe);

  // Curva de pandeo AISC/AISI (se usa como aproximación conservadora para LTB)
  let Fn;
  if (lambda_c <= 1.5) {
    Fn = Math.pow(0.658, lambda_c ** 2) * correa.Fy;
  } else {
    Fn = (0.877 / lambda_c ** 2) * correa.Fy;
  }

  return Math.min(1.0, Math.max(0.30, Fn / correa.Fy));
}

/**
 * Verifica una correa bajo carga gravitatoria y succión de viento.
 *
 * @param {Object} correa       - Perfil de CORREAS_TIPO (debe tener Ix, Sx, Fy)
 * @param {number} D            - Carga muerta distribuida [kN/m²] (plano horizontal)
 * @param {number} Lr           - Sobrecarga techo [kN/m²]
 * @param {number} sepCorreas   - Separación entre correas (tributaria ancho) [m]
 * @param {number} L            - Luz de la correa = separación entre pórticos [m]
 * @param {number} [theta_deg]  - Ángulo del faldón [°]
 * @param {string} [bridging]   - Arriostramiento: 'cladding' | 'half' | 'third' | 'none'
 * @param {number} [W_uplift]   - Presión de succión de viento (valor positivo) [kN/m²]
 * @returns {Object|null}
 */
export function verificarCorrea(correa, D, Lr, sepCorreas, L, theta_deg = 0, bridging = 'cladding', W_uplift = 0) {
  if (!correa?.Ix || !correa?.Sx || !correa?.Fy) return null;

  const cosTheta = Math.cos((theta_deg || 0) * Math.PI / 180);
  const L_mm = L * 1000;

  // ── Longitud no arriostrada para el ala inferior (caso succión) ──
  // El chapeado arriostra el ala SUPERIOR. Para el ala inferior:
  // 'cladding'→ sin tirillas, ala inf. libre: Lb = L
  // 'none'    → ídem: Lb = L
  // 'half'    → tirilla al punto medio: Lb = L/2
  // 'third'   → tirillas a los tercios: Lb = L/3
  let Lb_uplift_mm;
  switch (bridging) {
    case 'third': Lb_uplift_mm = L_mm / 3; break;
    case 'half':  Lb_uplift_mm = L_mm / 2; break;
    default:      Lb_uplift_mm = L_mm; // 'cladding' o 'none': ala inferior libre
  }

  // ── VERIFICACIÓN GRAVITATORIA (D + Lr) ──
  // Ala superior comprimida → arriostrada por chapeado → sin LTB
  const qd_correa  = D  * sepCorreas * cosTheta; // [kN/m]
  const qlr_correa = Lr * sepCorreas * cosTheta;
  const qu_grav = 1.2 * qd_correa + 1.6 * qlr_correa;
  const Mu_grav = qu_grav * L * L / 8; // [kN·m]

  // Capacidad completa (sin reducción LTB bajo gravedad)
  const phiMn = 0.90 * correa.Fy * correa.Sx / 1e3; // MPa × cm³ / 1e3 → kN·m
  const ratioM = phiMn > 0 ? Mu_grav / phiMn : 999;

  // ── FLECHA DE SERVICIO (D + Lr) ──
  const q_serv = qd_correa + qlr_correa;
  const Ix_m4  = correa.Ix * 1e-8;       // cm⁴ → m⁴
  const E_kNm2 = E_acero * 1000;         // MPa → kN/m²

  const delta_m = Ix_m4 > 0
    ? 5 * q_serv * L ** 4 / (384 * E_kNm2 * Ix_m4)
    : 9999;
  const delta_mm  = delta_m * 1000;
  const limite_mm = (L / 240) * 1000;
  const ratioFlecha = limite_mm > 0 ? delta_mm / limite_mm : 999;

  // ── VERIFICACIÓN BAJO SUCCIÓN DE VIENTO (0.9D + 1.0W uplift) ──
  let uplift = null;
  if (W_uplift > 0) {
    // Carga neta sobre la correa: succión viento menos peso propio estabilizador
    const q_viento   = W_uplift * sepCorreas * cosTheta; // succión [kN/m] (positivo = hacia arriba)
    const q_net      = q_viento - 0.9 * qd_correa;       // carga neta resultante [kN/m]

    if (q_net > 0) { // hay succión neta → ala inferior comprimida
      const Mu_uplift = q_net * L * L / 8;
      const ltbFactor = ltbReductionFactor(correa, Lb_uplift_mm);
      const phiMn_uplift = phiMn * ltbFactor;
      const ratioM_uplift = phiMn_uplift > 0 ? Mu_uplift / phiMn_uplift : 999;

      uplift = {
        Mu_uplift:     +Mu_uplift.toFixed(3),
        phiMn_uplift:  +phiMn_uplift.toFixed(3),
        ratioM_uplift: +ratioM_uplift.toFixed(3),
        ltbFactor:     +ltbFactor.toFixed(3),
        Lb_uplift_m:   +(Lb_uplift_mm / 1000).toFixed(2),
        pasa:          ratioM_uplift <= 1.0,
      };
    }
  }

  const pasaUplift = uplift ? uplift.pasa : true;

  return {
    // Gravedad
    Mu:          +Mu_grav.toFixed(3),
    phiMn:       +phiMn.toFixed(3),
    ratioM:      +ratioM.toFixed(3),
    // Flecha
    delta_mm:    +delta_mm.toFixed(1),
    limite_mm:   +limite_mm.toFixed(1),
    ratioFlecha: +ratioFlecha.toFixed(3),
    // Cargas de referencia
    qd_correa:   +qd_correa.toFixed(4),
    qlr_correa:  +qlr_correa.toFixed(4),
    qu:          +qu_grav.toFixed(4),
    // Succión
    uplift,
    // Estado global
    pasa:        ratioM <= 1.0 && ratioFlecha <= 1.0 && pasaUplift,
    pasaM:       ratioM <= 1.0,
    pasaFlecha:  ratioFlecha <= 1.0,
  };
}
