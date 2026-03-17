import { getRoofType } from '../../roofTypes/registry.js';

/** Orquesta la vista 3D delegando a la tipología activa */
export function View3D({ r }) {
  const roofType = getRoofType(r.roofType);
  return <roofType.Render3D r={r} />;
}
