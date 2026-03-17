/**
 * roofTypes/dosAguas/index.js — Módulo completo cubierta a 2 aguas
 * Implementa la interfaz RoofType
 */

import { calcGeometry } from './calc.js';
import { getCp } from './cp.js';
import { calcFrameForces } from './frameForces.js';
import { Render2D } from './geometry2D.jsx';
import { Render3D } from './geometry3D.jsx';

/** @type {import('../RoofType.js').RoofTypeModule} */
const dosAguas = {
  id: '2aguas',
  label: 'Cubierta a 2 aguas',
  icon: '⛺',
  available: true,

  defaultInputs: {
    ridgeOffset: 0,
  },

  inputFields: (inp, onChange) => [
    { type: 'numeric', label: 'Desplaz. Cumbrera', key: 'ridgeOffset', unit: 'm', min: -50, max: 50, step: 0.1, hint: '0=centrada' },
  ],

  calcGeometry,
  getCp,
  calcFrameForces,
  Render2D,
  Render3D,
};

export default dosAguas;
