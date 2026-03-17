/** Tabla 1.6-1 — Factor de Direccionalidad Kd */
export const T_1_6_1 = {
  'Edificios: SPRFV':                    0.85,
  'Edificios: C&R':                      0.85,
  'Cubiertas abovedadas':                0.85,
  'Chimeneas/tanques: Cuadradas':        0.90,
  'Chimeneas/tanques: Hexagonales':      0.95,
  'Chimeneas/tanques: Redondas':         1.00,
  'Chimeneas/tanques: Octagonales':      1.00,
  'Carteles llenos':                     0.85,
  'Carteles abiertos y reticulada':      0.85,
  'Torres reticuladas: Triang/cuad/rect':0.85,
  'Torres reticuladas: Otra sección':    0.95,
};

/**
 * Retorna Kd para el tipo de estructura dado.
 * @param {string} structKey
 * @returns {number} Kd (default 0.85 si no se encuentra)
 */
export function getKd(structKey) {
  return T_1_6_1[structKey] ?? 0.85;
}
