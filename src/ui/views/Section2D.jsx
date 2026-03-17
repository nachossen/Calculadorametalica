import { getRoofType } from '../../roofTypes/registry.js';

/** Orquesta la vista 2D delegando a la tipología activa */
export function Section2D({ r, onSupportChange }) {
  const roofType = getRoofType(r.roofType);
  return <roofType.Render2D r={r} ff={r.frameForces} onSupportChange={onSupportChange} />;
}
