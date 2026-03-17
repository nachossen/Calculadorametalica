import { C } from '../common/theme.js';

/** Selector desplegable — SL */
export function SelectInput({ l, v, oc, opts }) {
  return (
    <div className="mb-1.5">
      <label className="text-xs" style={{ color: C.dm }}>{l}</label>
      <select
        value={v} onChange={e => oc(e.target.value)}
        className="w-full px-2 py-1 rounded text-xs mt-0.5 outline-none cursor-pointer"
        style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}>
        {opts.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
      </select>
    </div>
  );
}
