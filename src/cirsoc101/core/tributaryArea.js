/**
 * cirsoc101/core/tributaryArea.js — Cálculo de área tributaria e influencia
 * Cap. 4.7.2 CIRSOC 101-2025
 */

/**
 * Calcula área tributaria y de influencia de una columna en grilla.
 * @param {number[]} gridX — posiciones X de ejes (columnas)
 * @param {number[]} gridY — posiciones Y de ejes (filas)
 * @param {number} colI — índice de columna seleccionada
 * @param {number} rowJ — índice de fila seleccionada
 * @returns {{ AT: number, AI: number, tribBounds: Object, influenceBounds: Object }}
 */
export function calcTributaryArea(gridX, gridY, colI, rowJ) {
  const nx = gridX.length;
  const ny = gridY.length;

  // Tributary area = half spans on each side
  const xL = colI > 0 ? (gridX[colI] + gridX[colI - 1]) / 2 : gridX[colI];
  const xR = colI < nx - 1 ? (gridX[colI] + gridX[colI + 1]) / 2 : gridX[colI];
  const yB = rowJ > 0 ? (gridY[rowJ] + gridY[rowJ - 1]) / 2 : gridY[rowJ];
  const yT = rowJ < ny - 1 ? (gridY[rowJ] + gridY[rowJ + 1]) / 2 : gridY[rowJ];

  const tribW = xR - xL;
  const tribH = yT - yB;
  const AT = tribW * tribH;

  // Influence area = full adjacent spans
  const ixL = colI > 0 ? gridX[colI - 1] : gridX[colI];
  const ixR = colI < nx - 1 ? gridX[colI + 1] : gridX[colI];
  const iyB = rowJ > 0 ? gridY[rowJ - 1] : gridY[rowJ];
  const iyT = rowJ < ny - 1 ? gridY[rowJ + 1] : gridY[rowJ];

  const AI = (ixR - ixL) * (iyT - iyB);

  return {
    AT,
    AI,
    tribBounds: { x: xL, y: yB, w: tribW, h: tribH },
    influenceBounds: { x: ixL, y: iyB, w: ixR - ixL, h: iyT - iyB },
  };
}
