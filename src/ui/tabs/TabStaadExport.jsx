/**
 * ui/tabs/TabStaadExport.jsx — Exportación de cargas STAAD Pro
 * Toggle Dir/Env, código monoespaciado, botón copiar
 */

import { useState, useMemo } from 'react';
import { Badge } from '../common/Badge.jsx';
import { C } from '../common/theme.js';
import { generateStaadDireccional, generateStaadEnvolvente } from '../../methods/staadExport.js';

export function TabStaadExport({ r, envR }) {
  const [method, setMethod] = useState('dir');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    return method === 'dir'
      ? generateStaadDireccional(r)
      : generateStaadEnvolvente(envR);
  }, [method, r, envR]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-4 max-w-4xl space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge color={C.ac}>STAAD Pro</Badge>
        <span className="text-sm font-bold" style={{ color: C.tx }}>Exportación de Cargas de Viento</span>
      </div>

      {/* Toggle Dir/Env */}
      <div className="flex gap-1">
        {[
          { id: 'dir', label: 'Método Direccional' },
          { id: 'env', label: 'Método Envolvente' },
        ].map(m => (
          <button key={m.id} onClick={() => setMethod(m.id)}
            className="px-3 py-1.5 rounded text-xs font-bold transition-colors"
            style={{
              background: method === m.id ? C.ac : 'transparent',
              color: method === m.id ? '#fff' : C.dm,
              border: `1px solid ${method === m.id ? C.ac : C.bd}`,
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-lg p-2.5 text-xs" style={{ background: '#1e3a5f22', border: `1px solid ${C.bd}`, color: C.dm }}>
        {method === 'dir' ? (
          <>
            Genera load cases para el pórtico típico. Las cargas distribuidas (kN/m) ya incluyen la separación entre pórticos.
            Paredes usan <strong style={{ color: C.tx }}>UNI GX</strong> (eje global X).
            Cubiertas usan <strong style={{ color: C.tx }}>UNI LOCAL Y</strong> (perpendicular al faldón).
            Asignar los IDs de miembros en cada línea.
          </>
        ) : (
          <>
            Genera 8 load cases (4 casos × 2 signos GCpi). Las presiones están en kN/m² (zonas).
            Paredes usan <strong style={{ color: C.tx }}>UNI GX</strong>.
            Cubiertas usan <strong style={{ color: C.tx }}>UNI LOCAL Y</strong>.
            Asignar miembros/placas según las zonas del modelo.
          </>
        )}
      </div>

      {/* Copy button */}
      <div className="flex items-center gap-2">
        <button onClick={handleCopy}
          className="px-4 py-1.5 rounded text-xs font-bold transition-colors"
          style={{
            background: copied ? '#22c55e' : C.ac,
            color: '#fff',
            border: 'none',
          }}>
          {copied ? 'Copiado!' : 'Copiar al portapapeles'}
        </button>
        <span className="text-xs" style={{ color: C.dm }}>
          {code.split('\n').length} líneas
        </span>
      </div>

      {/* Code block */}
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.bd}` }}>
        <pre className="p-3 overflow-x-auto text-xs leading-relaxed"
          style={{
            background: '#0a0e17',
            color: '#a5d6ff',
            fontFamily: 'Consolas, "Courier New", monospace',
            margin: 0,
            maxHeight: 500,
            whiteSpace: 'pre',
            tabSize: 2,
          }}>
          {code}
        </pre>
      </div>
    </div>
  );
}
