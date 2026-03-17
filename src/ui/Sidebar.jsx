/**
 * ui/Sidebar.jsx — Panel lateral con tabs de inputs
 */

import { useState, useEffect } from 'react';
import { Wind, Building2, MapPin, Compass, DoorOpen, ChevronDown, ChevronRight, Plus, X, Menu, Mountain } from 'lucide-react';
import { NumericInput } from './inputs/NumericInput.jsx';
import { SelectInput } from './inputs/SelectInput.jsx';
import { CalcResult } from './inputs/CalcResult.jsx';
import { Badge } from './common/Badge.jsx';
import { C } from './common/theme.js';
import { VELOCIDADES_ARG, CAT_RIESGO } from '../data/velocidades.js';
import { T_1_6_1 } from '../data/kd.js';
import { T_1_11_1, getGCpi } from '../data/gcpi.js';
import { classifyEnclosureDetailed } from '../core/enclosure.js';
import { ROOF_TYPES } from '../roofTypes/registry.js';

const TABS = [
  { id: 'loc', ic: MapPin,    l: 'Ubicación' },
  { id: 'geo', ic: Building2, l: 'Geometría' },
  { id: 'topo', ic: Mountain, l: 'Topografía' },
  { id: 'open', ic: DoorOpen, l: 'Aberturas' },
];

export function Sidebar({ inp, setI, r, collapsed, setCollapsed }) {
  const [tab, setTab] = useState('loc');
  const [openWalls, setOpenWalls] = useState({});
  const s = (k, v) => setI(p => ({ ...p, [k]: v }));

  // Actualizar velocidad cuando cambia localidad o riesgo
  useEffect(() => {
    if (inp.localidad && VELOCIDADES_ARG[inp.localidad]) {
      const col = CAT_RIESGO[inp.riesgo]?.col;
      const v = col ? VELOCIDADES_ARG[inp.localidad][col] : null;
      if (v && v !== inp.V) s('V', v);
    }
  }, [inp.localidad, inp.riesgo]);

  // Clasificar cerramiento automáticamente según aberturas
  const wallNames = ['Frente', 'Contrafr.', 'Lat. Este', 'Lat. Oeste'];
  const walls = wallNames.map((n, i) => {
    const isL = i >= 2;
    const ag = (isL ? inp.L : inp.B) * inp.he;
    const ao = (inp.openings[i] || []).reduce((x, o) => x + o.w * o.h, 0);
    return { n, ag, ao };
  });
  const encResult = classifyEnclosureDetailed(walls);
  const ec = encResult.classification;
  useEffect(() => { if (ec !== inp.enclosure) s('enclosure', ec); }, [ec]);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-3" style={{ width: 44, background: C.sb, borderRight: `1px solid ${C.bd}` }}>
        <button onClick={() => setCollapsed(false)} className="p-1.5 rounded" style={{ color: C.dm }}><Menu size={16} /></button>
        {TABS.map(t => <t.ic key={t.id} size={14} style={{ color: tab === t.id ? C.ac : C.dm }} className="cursor-pointer" onClick={() => { setCollapsed(false); setTab(t.id); }} />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ width: 310, background: C.sb, borderRight: `1px solid ${C.bd}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${C.bd}` }}>
        <div className="flex items-center gap-1.5">
          <Wind size={16} style={{ color: C.ac }} />
          <span className="text-xs font-bold" style={{ color: C.tx }}>CIRSOC 102-2025</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="p-1 rounded" style={{ color: C.dm }}><Menu size={14} /></button>
      </div>

      {/* Tab buttons */}
      <div className="flex" style={{ borderBottom: `1px solid ${C.bd}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1.5"
            style={{ color: tab === t.id ? C.ac : C.dm, borderBottom: tab === t.id ? `2px solid ${C.ac}` : '2px solid transparent', fontSize: 9 }}>
            <t.ic size={12} /><span>{t.l}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* === UBICACIÓN === */}
        {tab === 'loc' && <>
          <SelectInput l="Localidad" v={inp.localidad} oc={v => s('localidad', v)}
            opts={[{ v: '', l: '— Personalizado —' }, ...Object.keys(VELOCIDADES_ARG).map(k => ({ v: k, l: k }))]} />
          <SelectInput l="Cat. Riesgo (Tabla 1.14-1)" v={inp.riesgo} oc={v => s('riesgo', v)}
            opts={Object.entries(CAT_RIESGO).map(([k, v]) => ({ v: k, l: `${k} — ${v.d}` }))} />
          <NumericInput l="Velocidad Básica V" v={inp.V} onChange={v => s('V', v)} u="m/s" min={20} max={100} step={0.1} />
          <SelectInput l="Cat. Exposición (Sec. 1.9)" v={inp.exposure} oc={v => s('exposure', v)}
            opts={[
              { v: 'B', l: 'B — Urbana / suburbana' },
              { v: 'C', l: 'C — Campo abierto' },
              { v: 'D', l: 'D — Costera / mar abierto' },
            ]} />
          <div className="rounded px-2 py-1 mt-0.5 text-xs leading-relaxed" style={{ background: C.cd, color: C.dm, border: `1px solid ${C.bd}` }}>
            {inp.exposure === 'B' && 'Zona urbana/suburbana con edificaciones, árboles u obstrucciones próximas de altura ≥ h del edificio. Produce las menores presiones de viento.'}
            {inp.exposure === 'C' && 'Campo abierto con pocos obstáculos, terreno plano. Categoría más frecuente para estructuras rurales o industriales aisladas.'}
            {inp.exposure === 'D' && 'Costera o mar abierto, superficies lisas sin obstrucciones. Produce las mayores presiones de viento (perfil más uniforme).'}
            <div className="mt-0.5" style={{ color: C.dm, fontSize: 9 }}>Kz se evalúa a z=h (altura media del edificio) para presiones globales.</div>
          </div>
          <NumericInput l="Altitud (Tabla 1.12-1)" v={inp.altitude} onChange={v => s('altitude', v)} u="m.s.n.m." min={0} max={5000} step={10} />
          <SelectInput l="Tipo Estructura (Tabla 1.6-1)" v={inp.structKey} oc={v => s('structKey', v)}
            opts={Object.keys(T_1_6_1).map(k => ({ v: k, l: k }))} />
          <SelectInput l="Sistema Estructural" v={inp.structSystem} oc={v => s('structSystem', v)}
            opts={['Acero', 'HA', 'Muro cortante', 'Otra']} />
          <div className="mt-2 rounded p-1.5 space-y-0.5" style={{ background: `${C.ac}08`, border: `1px solid ${C.ac}15` }}>
            <CalcResult l="Kd (T.1.6-1)" v={r.Kd} />
            <CalcResult l="Ke (T.1.12-1)" v={r.Ke} f={`Alt=${inp.altitude}m`} />
            <CalcResult l="Kz(h) (T.1.13-1)" v={r.Kz_h} f={`z=h=${r.h.toFixed(1)}m Exp.${inp.exposure}`} />
            <CalcResult l="Kzt (Fig.1.8-1)" v={r.Kzt} f={inp.topoType === 'Plano' ? 'Terreno plano' : `K1=${r.K1.toFixed(3)} K2=${r.K2.toFixed(3)} K3=${r.K3.toFixed(3)}`} />
          </div>
        </>}

        {/* === GEOMETRÍA === */}
        {tab === 'geo' && <>
          <SelectInput l="Tipología de Cubierta" v={inp.roofType} oc={v => s('roofType', v)}
            opts={ROOF_TYPES.map(rt => ({ v: rt.id, l: rt.label + (!rt.available ? ' (próx.)' : '') }))} />
          <NumericInput l="Ancho B — Frente" v={inp.B} onChange={v => s('B', v)} u="m" min={1} max={200} step={0.5} hint="⊥ viento 0°" />
          <NumericInput l="Longitud L — Lateral" v={inp.L} onChange={v => s('L', v)} u="m" min={1} max={500} step={0.5} />
          <NumericInput l={inp.roofType === '1agua' ? 'Altura Alero Bajo he' : 'Altura Alero he'} v={inp.he} onChange={v => s('he', v)} u="m" min={2} max={100} step={0.5} />
          <NumericInput l={inp.roofType === '1agua' ? 'Altura Alero Alto hc' : 'Altura Cumbrera hc'} v={inp.hc} onChange={v => s('hc', v)} u="m" min={2} max={120} step={0.5} />
          {inp.roofType === '2aguas' && <NumericInput l="Desplaz. Cumbrera" v={inp.ridgeOffset} onChange={v => s('ridgeOffset', v)} u="m" min={-50} max={50} step={0.1} hint="0=centrada" />}
          <NumericInput l="Cantidad Pórticos" v={inp.porticos} onChange={v => s('porticos', v)} min={2} max={100} step={1} />
          <div className="mt-2 rounded p-1.5 space-y-0.5" style={{ background: `${C.ac}08`, border: `1px solid ${C.ac}15` }}>
            <CalcResult l="θ cubierta" v={r.theta} u="°" />
            <CalcResult l="h media" v={r.h} u="m" f={`(${inp.he}+${inp.hc})/2`} />
            <CalcResult l="Separación pórticos" v={r.frameForces.sep} u="m" f={`${inp.L}/(${inp.porticos}-1)`} />
            <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${C.bd}` }}>
              <div className="text-xs font-bold mb-0.5" style={{ color: C.ac }}>Frecuencia — Sec. 1.9.3.1</div>
              <CalcResult l="n₁" v={r.n1} u="Hz" f={({Acero:'8.58/h^0.8',HA:'14.93/h^0.9','Muro cortante':'117.3√Cw/h'})[inp.structSystem]||'22.86/h'} />
              <div className="mt-0.5">{r.isRigid ? <Badge color={C.ok}>RÍGIDA</Badge> : <Badge color={C.w}>FLEXIBLE</Badge>}</div>
              <CalcResult l="G (Sec. 1.9.3)" v={r.G} f={r.isRigid ? 'Rígida → G=0.85 (Sec.1.9.3)' : `Ec.1.9-2 (flexible)\nIz=${r.Iz.toFixed(4)} Q=${r.Q.toFixed(4)}`} />
            </div>
          </div>
        </>}

        {/* === TOPOGRAFÍA === */}
        {tab === 'topo' && <>
          <div className="text-xs mb-2" style={{ color: C.dm }}>Figura 1.8-1 — Kzt = (1 + K1·K2·K3)²</div>
          <SelectInput l="Tipo de Topografía" v={inp.topoType} oc={v => s('topoType', v)}
            opts={['Plano', 'Loma 2D', 'Escarpe 2D', 'Colina 3D']} />
          {inp.topoType !== 'Plano' && <>
            <NumericInput l="H — Altura de elevación" v={inp.H_hill} onChange={v => s('H_hill', v)} u="m" min={0} max={500} step={1} />
            <NumericInput l="Lh — Semilongitud" v={inp.Lh} onChange={v => s('Lh', v)} u="m" min={1} max={5000} step={10} />
            <NumericInput l="x — Dist. a cresta" v={inp.x_dist} onChange={v => s('x_dist', v)} u="m" min={-5000} max={5000} step={5} />
            {inp.topoType === 'Escarpe 2D' && <SelectInput l="Posición" v={inp.topoSide} oc={v => s('topoSide', v)} opts={['Barlovento', 'Sotavento']} />}
            <div className="mt-2 rounded p-1.5 space-y-0.5" style={{ background: `${C.ac}08`, border: `1px solid ${C.ac}15` }}>
              <CalcResult l="H/Lh" v={r.HLh} f={`${inp.H_hill}/${inp.Lh}${r.HLh >= 0.5 ? ' (cap 0.5)' : ''}`} />
              <CalcResult l="K1 (tabla)" v={r.K1} f={`Interp. Fig.1.8-1 H/Lh=${r.HLh.toFixed(2)}`} />
              <CalcResult l="K2 (tabla)" v={r.K2} f={`x/Lh=${r.xLh.toFixed(2)}`} />
              <CalcResult l="K3 (tabla)" v={r.K3} f={`z/Lh=${r.zLh.toFixed(2)}`} />
              <CalcResult l="Kzt" v={r.Kzt} f="(1+K1·K2·K3)²" />
            </div>
          </>}
          {inp.topoType === 'Plano' && (
            <div className="mt-3 text-center py-6 rounded" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
              <div className="text-sm font-semibold" style={{ color: C.tx }}>Kzt = 1.00</div>
              <div className="text-xs mt-1" style={{ color: C.dm }}>Terreno plano — sin efecto topográfico</div>
            </div>
          )}
        </>}

        {/* === ABERTURAS === */}
        {tab === 'open' && <>
          <div className="space-y-1.5 mb-3">
            {wallNames.map((wname, wi) => {
              const ops = inp.openings[wi] || [];
              const ao = ops.reduce((x, o) => x + o.w * o.h, 0);
              return (
                <div key={wi} className="rounded" style={{ background: C.bg, border: `1px solid ${C.bd}` }}>
                  <button onClick={() => setOpenWalls(p => ({ ...p, [wi]: !p[wi] }))} className="flex items-center justify-between w-full px-2 py-1 text-xs">
                    <span style={{ color: C.tx }}>{wname}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono" style={{ color: C.dm }}>Ao={ao.toFixed(1)}m²</span>
                      {openWalls[wi] ? <ChevronDown size={11} style={{ color: C.dm }} /> : <ChevronRight size={11} style={{ color: C.dm }} />}
                    </div>
                  </button>
                  {openWalls[wi] && (
                    <div className="px-2 pb-1.5 space-y-1">
                      {ops.length === 0 && <div className="text-xs italic" style={{ color: C.dm }}>Sin aberturas</div>}
                      {ops.map((op, oi) => (
                        <div key={oi} className="flex items-center gap-1">
                          <input type="number" value={op.w} step={0.1} min={0}
                            onChange={e => { const n = [...ops]; n[oi] = { ...n[oi], w: parseFloat(e.target.value) || 0 }; s('openings', { ...inp.openings, [wi]: n }); }}
                            className="w-14 px-1 py-0.5 rounded text-xs font-mono" style={{ background: C.cd, color: C.tx, border: `1px solid ${C.bd}` }} />
                          <span className="text-xs" style={{ color: C.dm }}>×</span>
                          <input type="number" value={op.h} step={0.1} min={0}
                            onChange={e => { const n = [...ops]; n[oi] = { ...n[oi], h: parseFloat(e.target.value) || 0 }; s('openings', { ...inp.openings, [wi]: n }); }}
                            className="w-14 px-1 py-0.5 rounded text-xs font-mono" style={{ background: C.cd, color: C.tx, border: `1px solid ${C.bd}` }} />
                          <span className="text-xs" style={{ color: C.dm }}>m</span>
                          <button onClick={() => s('openings', { ...inp.openings, [wi]: ops.filter((_, j) => j !== oi) })} style={{ color: C.pos }}><X size={11} /></button>
                        </div>
                      ))}
                      <button onClick={() => s('openings', { ...inp.openings, [wi]: [...ops, { w: 1, h: 1 }] })} className="flex items-center gap-1 text-xs" style={{ color: C.ac }}>
                        <Plus size={11} />Abertura
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="rounded p-1.5" style={{ background: `${C.ac}08`, border: `1px solid ${C.ac}15` }}>
            <div className="text-xs font-bold mb-1" style={{ color: C.ac }}>Verificación Cerramiento (Sec. 1.11)</div>
            {/* Tabla detallada */}
            <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
                  <th className="text-left py-0.5 px-1" style={{ color: C.dm, fontSize: 9 }}>Pared</th>
                  <th className="text-right py-0.5 px-1" style={{ color: C.dm, fontSize: 9 }}>Ag</th>
                  <th className="text-right py-0.5 px-1" style={{ color: C.dm, fontSize: 9 }}>Ao</th>
                  <th className="text-right py-0.5 px-1" style={{ color: C.dm, fontSize: 9 }}>Ao/Ag</th>
                  <th className="text-right py-0.5 px-1" style={{ color: C.dm, fontSize: 9 }}>Aoi</th>
                </tr>
              </thead>
              <tbody>
                {walls.map((w, i) => {
                  const d = encResult.details[i];
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.bd}22` }}>
                      <td className="py-0.5 px-1" style={{ color: C.dm }}>{w.n}</td>
                      <td className="text-right py-0.5 px-1" style={{ color: C.tx }}>{w.ag.toFixed(0)}</td>
                      <td className="text-right py-0.5 px-1" style={{ color: C.tx }}>{w.ao.toFixed(1)}</td>
                      <td className="text-right py-0.5 px-1" style={{ color: d.ratio > 0.8 ? C.w : d.ratio > 0.1 ? C.ac : C.tx }}>{(d.ratio * 100).toFixed(0)}%</td>
                      <td className="text-right py-0.5 px-1" style={{ color: C.tx }}>{d.Aoi.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-1.5 pt-1" style={{ borderTop: `1px solid ${C.bd}` }}>
              <Badge color={ec === 'Cerrado' ? C.ok : ec === 'Parcialmente Abierto' ? '#f59e0b' : ec === 'Abierto' ? C.w : C.pos}>{ec}</Badge>
              <span className="text-xs font-mono font-bold" style={{ color: C.ac }}>GCpi=±{T_1_11_1[ec]?.p || 0.18}</span>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
