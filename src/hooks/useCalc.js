/**
 * hooks/useCalc.js — Hook que ejecuta el cálculo completo (memoizado)
 */

import { useMemo } from 'react';
import { runDireccional } from '../methods/direccional.js';
import { runEnvolvente } from '../methods/envolvente.js';
import { compareResults } from '../methods/comparador.js';
import { runComponentes } from '../methods/componentes.js';

/**
 * Ejecuta los métodos de cálculo, memoizados por los inputs.
 * @param {Object} inp
 * @returns {{ r: Object, envR: Object, cmpR: Object, crR: Object }}
 */
export function useCalc(inp) {
  const r    = useMemo(() => runDireccional(inp), [inp]);
  const envR = useMemo(() => runEnvolvente(inp, r), [inp, r]);
  const cmpR = useMemo(() => compareResults(r, envR), [r, envR]);
  const crR  = useMemo(() => runComponentes(inp, r), [inp, r]);
  return { r, envR, cmpR, crR };
}
