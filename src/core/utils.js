/**
 * core/utils.js — Funciones de interpolación puras
 */

/**
 * Interpolación lineal escalar.
 * @param {number} x
 * @param {number} x0
 * @param {number} x1
 * @param {number} y0
 * @param {number} y1
 * @returns {number}
 */
export function lerp(x, x0, x1, y0, y1) {
  return x1 === x0 ? y0 : y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

/**
 * Interpolación lineal en una tabla de objetos.
 * @param {Array<Object>} tbl — array de filas
 * @param {string} xk — clave de la columna X
 * @param {string} yk — clave de la columna Y
 * @param {number} xv — valor X a interpolar
 * @returns {number}
 */
export function interp(tbl, xk, yk, xv) {
  if (xv <= tbl[0][xk]) return tbl[0][yk];
  if (xv >= tbl[tbl.length - 1][xk]) return tbl[tbl.length - 1][yk];
  for (let i = 0; i < tbl.length - 1; i++) {
    if (xv >= tbl[i][xk] && xv <= tbl[i + 1][xk]) {
      return lerp(xv, tbl[i][xk], tbl[i + 1][xk], tbl[i][yk], tbl[i + 1][yk]);
    }
  }
  return tbl[tbl.length - 1][yk];
}
