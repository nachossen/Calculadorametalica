/**
 * hooks/useInputs.js — Estado de inputs de la aplicación
 */

import { useState } from 'react';

export const DEFAULT_INPUTS = {
  localidad:    'Buenos Aires',
  riesgo:       'II',
  V:            55.1,
  exposure:     'B',
  altitude:     0,
  B:            15,
  L:            20,
  he:           7,
  hc:           10,
  ridgeOffset:  0,
  porticos:     6,
  structKey:    'Edificios: SPRFV',
  structSystem: 'Acero',
  windAngle:    0,
  openings:     {},
  enclosure:    'Cerrado',
  topoType:     'Plano',
  H_hill:       0,
  Lh:           100,
  x_dist:       0,
  topoSide:     'Barlovento',
  roofType:     '2aguas',
  supportType:  'Empotrado',
  crElementType: 'paredes',
  crSubType:    'panel_pared',
  crTribArea:   10,
  crSep:        1.5,
  crLtramo:     6.0,
  crSepFij:     0.3,
  crManualAt:   false,
};

/**
 * Hook para manejar el estado de inputs.
 * @returns {[Object, Function]} [inputs, setInputs]
 */
export function useInputs() {
  const [inp, setInp] = useState(DEFAULT_INPUTS);
  return [inp, setInp];
}
