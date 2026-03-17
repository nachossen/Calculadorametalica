/**
 * roofTypes/unaAgua/index.js — Módulo completo cubierta a 1 agua
 */

import { calcGeometry } from './calc.js';
import { getCp } from './cp.js';
import { calcFrameForces } from './frameForces.js';
import { Render2D } from './geometry2D.jsx';
import { Render3D } from './geometry3D.jsx';

/** @type {import('../RoofType.js').RoofTypeModule} */
const unaAgua = {
  id: '1agua',
  label: 'Cubierta a 1 agua',
  icon: '⬔',
  available: true,

  defaultInputs: {},

  inputFields: () => [],

  calcGeometry,
  getCp,
  calcFrameForces,
  Render2D,
  Render3D,
};

export default unaAgua;
