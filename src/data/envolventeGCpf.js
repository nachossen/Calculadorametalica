/**
 * Figuras AC.3-1 y AC.3-2 — GCpf para el Método Envolvente (Ap. C)
 * Aplicable a edificios bajos: h ≤ 20 m
 */

/** Caso 1: Viento Transversal — zonas 1,2,3,4,1E,2E,3E,4E */
export const GCPF_C1 = [
  { t: 0,  s: { 1: 0.40, 2: -0.69, 3: -0.37, 4: -0.29, '1E': 0.61, '2E': -1.07, '3E': -0.53, '4E': -0.43 } },
  { t: 5,  s: { 1: 0.40, 2: -0.69, 3: -0.37, 4: -0.29, '1E': 0.61, '2E': -1.07, '3E': -0.53, '4E': -0.43 } },
  { t: 20, s: { 1: 0.53, 2: -0.69, 3: -0.48, 4: -0.43, '1E': 0.80, '2E': -1.07, '3E': -0.69, '4E': -0.64 } },
  { t: 30, s: { 1: 0.56, 2:  0.21, 3: -0.43, 4: -0.37, '1E': 0.69, '2E':  0.27, '3E': -0.53, '4E': -0.48 } },
  { t: 45, s: { 1: 0.56, 2:  0.21, 3: -0.43, 4: -0.37, '1E': 0.69, '2E':  0.27, '3E': -0.53, '4E': -0.48 } },
  { t: 90, s: { 1: 0.56, 2:  0.56, 3: -0.37, 4: -0.37, '1E': 0.69, '2E':  0.69, '3E': -0.48, '4E': -0.48 } },
];

/** Caso 2: Viento Longitudinal — constante para todo θ */
export const GCPF_C2 = {
  1: -0.45, 2: -0.69, 3: -0.37, 4: -0.45, 5:  0.40, 6: -0.29,
  '1E': -0.48, '2E': -1.07, '3E': -0.53, '4E': -0.48, '5E': 0.61, '6E': -0.43,
};

/** Caso 3: Torsional Transversal — zonas 1T-4T */
export const GCPF_C3 = [
  { t: 0,  s: { '1T':  0.10, '2T': -0.17, '3T': -0.09, '4T': -0.07 } },
  { t: 5,  s: { '1T':  0.10, '2T': -0.17, '3T': -0.09, '4T': -0.07 } },
  { t: 20, s: { '1T':  0.13, '2T': -0.17, '3T': -0.12, '4T': -0.11 } },
  { t: 30, s: { '1T':  0.14, '2T':  0.05, '3T': -0.11, '4T': -0.09 } },
  { t: 45, s: { '1T':  0.14, '2T':  0.05, '3T': -0.11, '4T': -0.09 } },
  { t: 90, s: { '1T':  0.14, '2T':  0.14, '3T': -0.09, '4T': -0.09 } },
];

/** Caso 4: Torsional Longitudinal (constante) */
export const GCPF_C4 = { '5T': 0.10, '6T': -0.07 };

/** Zonas por caso */
export const ENV_ZONES_C1 = ['1', '2', '3', '4', '1E', '2E', '3E', '4E'];
export const ENV_ZONES_C2 = ['1', '2', '3', '4', '5', '6', '1E', '2E', '3E', '4E', '5E', '6E'];
export const ENV_ZONES_C3 = ['1T', '2T', '3T', '4T'];
export const ENV_ZONES_C4 = ['5T', '6T'];

/** Descripciones de zonas para la interfaz */
export const ZONE_DESC = {
  '1':  'Pared BV',
  '2':  'Cubierta BV (borde)',
  '3':  'Cubierta SV',
  '4':  'Pared SV',
  '5':  'Pared BV (long)',
  '6':  'Pared SV (long)',
  '1E': 'Pared BV (extremo)',
  '2E': 'Cubierta BV borde (ext)',
  '3E': 'Cubierta SV (ext)',
  '4E': 'Pared SV (ext)',
  '5E': 'Pared BV long (ext)',
  '6E': 'Pared SV long (ext)',
  '1T': 'Pared BV tors',
  '2T': 'Cubierta BV tors',
  '3T': 'Cubierta SV tors',
  '4T': 'Pared SV tors',
  '5T': 'Pared BV long tors',
  '6T': 'Pared SV long tors',
};
