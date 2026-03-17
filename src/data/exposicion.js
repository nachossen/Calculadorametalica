/**
 * Tabla 1.9-1 — Constantes de Exposición del Terreno
 * Usadas para el cálculo del factor de ráfaga G (Sec. 1.9.3)
 */
export const T_1_9_1 = {
  B: {
    alpha:      7.5,
    zg:         1000,
    b_hat:      0.84,
    alpha_bar:  1 / 4.5,
    alpha_hat:  1 / 7.5,
    b_bar:      0.47,
    c:          0.30,
    l:          98,
    eps:        1 / 3,
    zmin:       9.2,
  },
  C: {
    alpha:      9.8,
    zg:         750,
    b_hat:      1.00,
    alpha_bar:  1 / 6.4,
    alpha_hat:  1 / 9.8,
    b_bar:      0.66,
    c:          0.20,
    l:          152,
    eps:        1 / 5,
    zmin:       4.6,
  },
  D: {
    alpha:      11.5,
    zg:         590,
    b_hat:      1.09,
    alpha_bar:  1 / 8.0,
    alpha_hat:  1 / 11.5,
    b_bar:      0.78,
    c:          0.15,
    l:          198,
    eps:        1 / 8,
    zmin:       2.1,
  },
};
