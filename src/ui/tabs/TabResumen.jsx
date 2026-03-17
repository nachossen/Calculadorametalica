/**
 * ui/tabs/TabResumen.jsx — Pestaña Resumen del Método Direccional
 */

import { Badge } from '../common/Badge.jsx';
import { Section2D } from '../views/Section2D.jsx';
import { View3D } from '../views/View3D.jsx';
import { C } from '../common/theme.js';

function KPI({ l, v, u, s }) {
  return (
    <div className="p-2 rounded-lg" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
      <div className="text-xs" style={{ color: C.dm }}>{l}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-lg font-mono font-bold" style={{ color: C.tx }}>{v}</span>
        {u && <span className="text-xs" style={{ color: C.dm }}>{u}</span>}
      </div>
      {s && <div className="text-xs mt-0.5" style={{ color: C.ac }}>{s}</div>}
    </div>
  );
}

export function TabResumen({ r, inp, setI }) {
  const ff = r.frameForces;

  const th2 = { background: C.bg, color: C.dm, padding: '5px 8px', fontSize: 10, textAlign: 'left', borderBottom: `1px solid ${C.bd}` };
  const td2 = { padding: '4px 8px', fontSize: 11, color: C.tx, borderBottom: `1px solid ${C.bd}`, fontFamily: 'monospace' };

  const surfRows = [
    { n: `${r.wl.ww} — Barlovento`,  cp: r.cpWW.toFixed(2),  mx: r.pWW.max,     mn: r.pWW.min     },
    { n: `${r.wl.lw} — Sotavento`,   cp: r.cpLW.toFixed(2),  mx: r.pLW.max,     mn: r.pLW.min     },
    { n: `${r.wl.l1} — Lateral`,     cp: r.cpLat.toFixed(1), mx: r.pLat.max,    mn: r.pLat.min    },
    { n: `${r.wl.l2} — Lateral`,     cp: r.cpLat.toFixed(1), mx: r.pLat.max,    mn: r.pLat.min    },
    { n: 'Cubierta BV (Cp max)',      cp: r.cpRBV?.max?.toFixed(2) ?? '—', mx: r.pRBVmax.max, mn: r.pRBVmax.min },
    { n: 'Cubierta BV (Cp min)',      cp: r.cpRBV?.min?.toFixed(2) ?? '—', mx: r.pRBVmin.max, mn: r.pRBVmin.min },
    { n: 'Cubierta SV', cp: typeof r.cpRSV === 'number' ? r.cpRSV.toFixed(2) : '—', mx: r.pRSV.max, mn: r.pRSV.min },
  ];

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KPI l="qh (Ec.1.10-1)" v={r.qh.toFixed(1)} u="Pa" s={`h=${r.h.toFixed(1)}m`} />
        <KPI l="V básica" v={r.V} u="m/s" s={inp.localidad || 'Personalizado'} />
        <KPI l="G (Ec.1.9-2)" v={r.G.toFixed(4)} s={r.isRigid ? 'Rígida' : 'Flexible'} />
        <KPI l="Cerramiento" v={r.enclosure} s={`GCpi=±${r.gcpi.p}`} />
      </div>

      {/* 3D + 2D */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className="rounded-lg p-2" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
          <div className="text-xs font-bold mb-1 px-1" style={{ color: C.dm }}>VISTA 3D — Pórticos y Presiones</div>
          <View3D r={r} />
        </div>
        <div className="rounded-lg p-2" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
          <div className="text-xs font-bold mb-1 px-1" style={{ color: C.dm }}>SECCIÓN TRANSVERSAL 2D</div>
          <Section2D r={r} onSupportChange={v => setI(p => ({ ...p, supportType: v }))} />
        </div>
      </div>

      {/* Tabla presiones */}
      <div className="rounded-lg overflow-hidden" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.bd}` }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.dm }}>Presiones — Ec. 2.4-1</span>
          <Badge>{r.isNorm ? 'Normal' : 'Paralelo'} a Cumbrera — {inp.windAngle}°</Badge>
        </div>
        <table className="w-full">
          <thead><tr>
            <th style={th2}>Superficie</th><th style={th2}>Cp</th>
            <th style={{ ...th2, textAlign: 'right' }}>p_max [Pa]</th>
            <th style={{ ...th2, textAlign: 'right' }}>p_min [Pa]</th>
          </tr></thead>
          <tbody>
            {surfRows.map((row, i) => (
              <tr key={i}>
                <td style={td2}>{row.n}</td>
                <td style={td2}>{row.cp}</td>
                <td style={{ ...td2, textAlign: 'right', color: row.mx > 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{row.mx > 0 ? '+' : ''}{row.mx.toFixed(1)}</td>
                <td style={{ ...td2, textAlign: 'right', color: row.mn > 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{row.mn > 0 ? '+' : ''}{row.mn.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-1 text-xs" style={{ color: C.dm, borderTop: `1px solid ${C.bd}` }}>
          p=q×G×Cp−qh×(±GCpi) | G={r.G.toFixed(4)} | GCpi=±{r.gcpi.p} | Beff={r.Beff}m Leff={r.Leff}m L/B={r.LB.toFixed(2)}
        </div>
      </div>

      {/* Cargas pórtico */}
      <div className="rounded-lg overflow-hidden" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.bd}` }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.dm }}>Cargas Distribuidas en Pórtico Típico</span>
          <span className="text-xs font-mono" style={{ color: C.ac }}>Sep.={ff.sep.toFixed(2)}m | {inp.supportType}</span>
        </div>
        <table className="w-full">
          <thead><tr>
            <th style={th2}>Elemento</th>
            <th style={{ ...th2, textAlign: 'right' }}>p [Pa]</th>
            <th style={{ ...th2, textAlign: 'right' }}>w = p×sep [kN/m]</th>
          </tr></thead>
          <tbody>
            {[
              { n: `Col. BV (${r.wl.ww})`, p: r.pWW.max, w: ff.w_ww_max, desc: 'max' },
              { n: `Col. BV (${r.wl.ww})`, p: r.pWW.min, w: ff.w_ww_min, desc: 'min' },
              { n: `Col. SV (${r.wl.lw})`, p: r.pLW.max, w: ff.w_lw_max, desc: 'max' },
              { n: `Col. SV (${r.wl.lw})`, p: r.pLW.min, w: ff.w_lw_min, desc: 'min' },
              { n: r.is1agua ? 'Faldón (Cp max)' : 'Faldón BV (Cp max)', p: r.pRBVmax.max, w: ff.w_rbv_max, desc: '' },
              { n: r.is1agua ? 'Faldón (Cp min)' : 'Faldón BV (Cp min)', p: r.pRBVmin.min, w: ff.w_rbv_min, desc: '' },
              ...(!r.is1agua ? [
                { n: 'Faldón SV (max)', p: r.pRSV.max, w: ff.w_rsv_max, desc: '' },
                { n: 'Faldón SV (min)', p: r.pRSV.min, w: ff.w_rsv_min, desc: '' },
              ] : []),
            ].map((row, i) => (
              <tr key={i}>
                <td style={{ ...td2, fontSize: 10 }}>{row.n} {row.desc && <span style={{ color: C.dm, fontSize: 8 }}>({row.desc})</span>}</td>
                <td style={{ ...td2, textAlign: 'right', color: row.p > 0 ? C.pos : C.neg }}>{row.p > 0 ? '+' : ''}{row.p.toFixed(0)}</td>
                <td style={{ ...td2, textAlign: 'right', fontWeight: 'bold', color: row.w > 0 ? C.pos : C.neg }}>{row.w > 0 ? '+' : ''}{row.w.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-1.5" style={{ borderTop: `1px solid ${C.bd}` }}>
          <div className="text-xs font-bold mb-1" style={{ color: C.ac }}>Reacciones en Base ({ff.isEmp ? 'Empotrado' : 'Articulado'})</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div style={{ color: C.tx }}>Rx = {ff.Rx_bv.toFixed(1)} kN <span style={{ color: C.dm }}>(c/apoyo)</span></div>
            <div style={{ color: C.tx }}>Ry = {ff.Ry_bv.toFixed(1)} kN <span style={{ color: C.dm }}>(levant.)</span></div>
            {ff.isEmp && <div style={{ color: C.tx }}>M base BV = {ff.M_bv.toFixed(1)} kN·m</div>}
            {ff.isEmp && <div style={{ color: C.tx }}>M base SV = {ff.M_sv.toFixed(1)} kN·m</div>}
          </div>
        </div>
      </div>

      {/* Quick factors */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
        {[
          ['Kd', r.Kd, 'T.1.6-1'], ['Ke', r.Ke.toFixed(4), 'T.1.12-1'], ['Kz', r.Kz_h.toFixed(4), 'T.1.13-1'],
          ['Kzt', r.Kzt.toFixed(4), 'F.1.8-1'], ['θ', r.theta.toFixed(1) + '°', ''], ['n₁', r.n1.toFixed(2) + 'Hz', 'S.1.9.3'],
        ].map(([k, v, rf]) => (
          <div key={k} className="p-1.5 rounded text-center" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
            <div className="text-xs" style={{ color: C.dm }}>{k}</div>
            <div className="text-sm font-mono font-semibold" style={{ color: C.tx }}>{v}</div>
            {rf && <div style={{ color: C.dm, fontSize: 8 }}>{rf}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
