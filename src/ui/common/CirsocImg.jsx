/**
 * ui/common/CirsocImg.jsx — Imagen de referencia CIRSOC colapsable
 */
import { C } from './theme.js';

/**
 * @param {{ src: string, alt: string, title: string }} props
 */
export function CirsocImg({ src, alt, title }) {
  return (
    <details className="rounded-lg overflow-hidden" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
      <summary className="px-3 py-2 cursor-pointer text-xs font-bold flex items-center gap-2" style={{ color: C.dm }}>
        <span style={{ color: C.ac }}>📋</span> {title}
        <span className="text-xs font-normal ml-auto" style={{ color: C.bd }}>click para expandir</span>
      </summary>
      <div className="p-2" style={{ borderTop: `1px solid ${C.bd}` }}>
        <img src={src} alt={alt} className="w-full rounded" style={{ maxHeight: 600, objectFit: 'contain', background: '#fff' }} />
      </div>
    </details>
  );
}
