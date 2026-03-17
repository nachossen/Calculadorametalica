import { useState } from 'react';
import { Info } from 'lucide-react';
import { C } from '../common/theme.js';

/** Resultado calculado (solo lectura) con tooltip opcional — CR */
export function CalcResult({ l, v, u, f }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center justify-between py-0.5 px-1.5 rounded text-xs"
      style={{ background: `${C.ac}08` }}>
      <span style={{ color: C.dm }}>{l}</span>
      <div className="flex items-center gap-1">
        <span className="font-mono font-semibold" style={{ color: C.ac }}>
          {typeof v === 'number' ? (Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2)) : v}
        </span>
        {u && <span style={{ color: C.dm }}>{u}</span>}
        {f && (
          <div className="relative">
            <Info size={10} className="cursor-pointer opacity-40 hover:opacity-100" style={{ color: C.ac }}
              onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} />
            {show && (
              <div className="absolute right-0 bottom-full mb-1 p-1.5 rounded text-xs font-mono z-50 whitespace-pre"
                style={{ background: C.cd, border: `1px solid ${C.bd}`, color: C.tx, maxWidth: 320 }}>
                {f}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
