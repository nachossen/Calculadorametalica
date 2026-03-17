/**
 * core/frequency.js — Frecuencia fundamental de la estructura
 * Sec. 1.9.3.1 — CIRSOC 102-2025
 */

/**
 * Calcula la frecuencia fundamental n1 [Hz] según CIRSOC 102-2025.
 * Ec.1.9-2  Acero:         n1 = 8.58  / h^0.8
 * Ec.1.9-3  Hormigón:      n1 = 14.93 / h^0.9
 * Ec.1.9-4  Otra:          n1 = 22.86 / h
 * Ec.1.9-5  Muro cortante: n1 = 117.3 × √Cw / h
 * @param {number} h — altura en metros
 * @param {string} structSystem — 'Acero' | 'HA' | 'Otra' | 'Muro cortante'
 * @param {number} [Cw=0] — parámetro Cw para muros de corte
 * @returns {number} n1 en Hz
 */
export function calcN1(h, structSystem, Cw = 0) {
  if (h <= 0) return 1;
  switch (structSystem) {
    case 'Acero':          return 8.58 / Math.pow(h, 0.8);
    case 'HA':             return 14.93 / Math.pow(h, 0.9);
    case 'Muro cortante':  return Cw > 0 ? 117.3 * Math.sqrt(Cw) / h : 22.86 / h;
    default:               return 22.86 / h;
  }
}
