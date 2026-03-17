/**
 * roofTypes/unaAgua/calc.js — Geometría para cubierta a 1 agua
 * θ = atan((hc - he) / B)
 */

/**
 * Calcula la geometría derivada para 1 agua.
 * @param {Object} inp
 * @returns {Object}
 */
export function calcGeometry(inp) {
  const { B, L, he, hc, windAngle } = inp;

  const halfSpan = B; // Para 1 agua: toda la longitud es el faldón
  const theta = halfSpan > 0 ? Math.atan((hc - he) / halfSpan) * 180 / Math.PI : 0;
  const thetaAbs = Math.abs(theta);
  // CIRSOC 102-2025 Sec. 1.3: cuando θ < 10°, h = he (altura del alero)
  const h = thetaAbs < 10 ? he : (he + hc) / 2;

  const angle = ((windAngle % 360) + 360) % 360;
  const isNorm = (angle < 45 || angle > 315 || (angle > 135 && angle < 225));
  const Beff = isNorm ? B : L;
  const Leff = isNorm ? L : B;
  const LB = Beff > 0 ? Leff / Beff : 1;
  const hOverL = Leff > 0 ? h / Leff : 0.5;

  let wl;
  if (isNorm) {
    const fromFront = angle < 90 || angle > 270;
    wl = { ww: fromFront ? 'Frente' : 'Contrafrente', lw: fromFront ? 'Contrafrente' : 'Frente', l1: 'Lat. Este', l2: 'Lat. Oeste' };
  } else {
    const fromEast = angle >= 45 && angle < 135;
    wl = { ww: fromEast ? 'Lat. Este' : 'Lat. Oeste', lw: fromEast ? 'Lat. Oeste' : 'Lat. Este', l1: 'Frente', l2: 'Contrafrente' };
  }

  return { h, theta: thetaAbs, halfSpan, Beff, Leff, LB, hOverL, isNorm, is1agua: true, wl };
}
