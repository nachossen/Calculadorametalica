import { C } from '../common/theme.js';

/** Input numérico con label y unidad — NI */
export function NumericInput({ l, v, onChange, u, min, max, step = 1, hint }) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs" style={{ color: C.dm }}>{l}</label>
        {hint && <span className="text-xs" style={{ color: C.dm, opacity: .5 }}>{hint}</span>}
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        <input
          type="number" value={v}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={min} max={max} step={step}
          className="w-full px-2 py-1 rounded text-xs font-mono outline-none"
          style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}
        />
        {u && <span className="text-xs font-mono" style={{ color: C.dm }}>{u}</span>}
      </div>
    </div>
  );
}
