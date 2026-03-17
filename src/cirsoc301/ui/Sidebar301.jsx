/**
 * Sidebar301.jsx — Panel lateral del módulo CIRSOC 301
 * Sub-tabs: Geometría | Cargas
 */
import { useState, useEffect, useMemo } from 'react';
import { Menu, Building2, Wind, Factory } from 'lucide-react';
import { C } from '../../ui/common/theme.js';
import { TIPOS_CUBIERTA } from '../../cirsoc101/data/cubiertas.js';
import { CORREAS_TIPO } from '../../cirsoc101/data/correas.js';
import { VELOCIDADES_ARG, CAT_RIESGO } from '../../data/velocidades.js';
import { computeWindLoads, LOCALIDADES } from '../core/windIntegration.js';
import { calcRoofLiveLoad, thetaToPendiente } from '../../cirsoc101/core/roofLiveLoad.js';
import { verificarCorrea } from '../core/correaDesign.js';

// ── Cargas de estructura soporte secundaria (igual que App101) ──────────────
const CARGAS_ESTRUCTURA = [
  { id: 'arriostr_liviano', nombre: 'Arriostramiento liviano (tensores)',   peso: 0.03 },
  { id: 'arriostr_medio',   nombre: 'Arriostramiento medio (cruces X)',     peso: 0.05 },
  { id: 'cabriada_liviana', nombre: 'Cabriadas livianas (< 12 m)',          peso: 0.08 },
  { id: 'cabriada_media',   nombre: 'Cabriadas medianas (12–20 m)',         peso: 0.12 },
  { id: 'cabriada_pesada',  nombre: 'Cabriadas pesadas (> 20 m)',           peso: 0.18 },
  { id: 'custom',           nombre: 'Personalizado',                         peso: 0 },
];

const CARGAS_INSTALACIONES = [
  { id: 'luminarias',    nombre: 'Luminarias industriales',    peso: 0.03 },
  { id: 'conductos',     nombre: 'Conductos HVAC',             peso: 0.10 },
  { id: 'sprinklers',    nombre: 'Sprinklers',                  peso: 0.07 },
  { id: 'canerias',      nombre: 'Cañerías y tuberías',        peso: 0.05 },
  { id: 'cielorraso',    nombre: 'Cielorraso suspendido',      peso: 0.10 },
  { id: 'aislacion_lv',  nombre: 'Aislación lana de vidrio',   peso: 0.02 },
];

// ── helpers de inputs ────────────────────────────────────────────────────────

function NI({ l, v, oc, u, min, max, step = 0.1, hint }) {
  return (
    <label className="flex items-center gap-1.5 text-xs" style={{ color: C.dm }}>
      <span className="flex-1 leading-tight">{l}</span>
      <input type="number" value={v} min={min} max={max} step={step}
        onChange={e => oc(+e.target.value)}
        className="w-20 px-1.5 py-1 rounded text-right text-xs font-mono"
        style={{ background: C.cd, color: C.tx, border: `1px solid ${C.bd}` }} />
      {u && <span className="text-[10px] w-12 shrink-0" style={{ color: C.dm }}>{u}</span>}
    </label>
  );
}

function SI({ l, v, oc, opts }) {
  return (
    <label className="flex items-center gap-1.5 text-xs" style={{ color: C.dm }}>
      <span className="flex-1 leading-tight">{l}</span>
      <select value={v} onChange={e => oc(e.target.value)}
        className="flex-1 px-1.5 py-1 rounded text-xs"
        style={{ background: C.cd, color: C.tx, border: `1px solid ${C.bd}` }}>
        {opts.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.v} value={o.v}>{o.l}</option>
        )}
      </select>
    </label>
  );
}

function InfoRow({ l, v, u, color }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span style={{ color: C.dm }}>{l}</span>
      <span className="font-mono font-bold" style={{ color: color || C.tx }}>{v}{u ? ` ${u}` : ''}</span>
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5 pt-1"
        style={{ color: accent || C.ac, borderTop: `1px solid ${C.bd}` }}>
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

/** Sección colapsable con checkbox (patrón App101) */
function CollapseBlock({ label, hint, checked, onToggle, children }) {
  return (
    <div className="rounded p-1.5" style={{ background: `${C.bg}88`, border: `1px solid ${C.bd}` }}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => onToggle(e.target.checked)}
          className="shrink-0" />
        <span className="text-xs font-bold" style={{ color: C.tx }}>{label}</span>
        {hint && <span className="text-[10px]" style={{ color: C.dm }}>{hint}</span>}
      </label>
      {checked && <div className="mt-1.5 space-y-1.5">{children}</div>}
    </div>
  );
}

// ── Tab Geometría ────────────────────────────────────────────────────────────

function TabGeo({ geo, setGeo }) {
  const s = (k, v) => setGeo(g => ({ ...g, [k]: v }));
  const sep   = geo.L / (geo.nPorticos - 1);
  const theta = Math.atan2(geo.hc - geo.he, geo.B / 2) * 180 / Math.PI;
  const Lraf  = Math.sqrt((geo.B / 2) ** 2 + (geo.hc - geo.he) ** 2);

  return (
    <div className="space-y-1.5">
      <Section title="Dimensiones">
        <NI l="Luz B" v={geo.B} oc={v => s('B', v)} u="m" min={6} max={60} step={0.5} />
        <NI l="Largo L" v={geo.L} oc={v => s('L', v)} u="m" min={10} max={300} step={1} />
        <NI l="Altura alero he" v={geo.he} oc={v => s('he', v)} u="m" min={2} max={20} step={0.5} />
        <NI l="Altura cumbrera hc" v={geo.hc} oc={v => s('hc', v)} u="m" min={geo.he + 0.5} max={30} step={0.5} />
      </Section>

      <Section title="Pórtico">
        <NI l="N° pórticos" v={geo.nPorticos} oc={v => s('nPorticos', Math.max(3, Math.round(v)))} u="" min={3} max={40} step={1} />
        <NI l="Sep. correas" v={geo.sepCorreas} oc={v => s('sepCorreas', v)} u="m" min={0.5} max={3} step={0.1} />
        <NI l="Sep. correas de pared" v={geo.sepGirts || 2.0} oc={v => s('sepGirts', v)} u="m" min={1} max={6} step={0.5} />
        <div className="text-[10px] rounded px-1.5 py-1" style={{ color: C.dm, background: `${C.ac}08` }}>
          Correas de pared: secundarias horiz. que arriostrán el eje débil de columnas. Espaciado típico 1.5–2.5 m.
        </div>
        <SI l="Tipo de base" v={geo.tipoBase} oc={v => {
          s('tipoBase', v);
          if (v === 'articulada') s('rotula', false);
        }}
          opts={[{ v: 'articulada', l: 'Articulada' }, { v: 'empotrada', l: 'Empotrada' }]} />

        {/* Rótula en encuentro columna-viga */}
        <label className="flex items-center gap-2 text-[10px] cursor-pointer"
          style={{ color: geo.tipoBase === 'articulada' ? `${C.dm}60` : C.dm }}
          title={geo.tipoBase === 'articulada' ? 'Requiere base empotrada (articulada+rótula = mecanismo inestable)' : ''}>
          <input type="checkbox" checked={!!geo.rotula}
            disabled={geo.tipoBase === 'articulada'}
            onChange={e => s('rotula', e.target.checked)} />
          <span className="text-xs font-bold" style={{ color: geo.tipoBase === 'articulada' ? `${C.tx}60` : C.tx }}>
            Rótula en encuentro columna-viga
          </span>
        </label>
        {geo.rotula && (
          <div className="text-[10px] rounded px-1.5 py-0.5"
            style={{ color: C.dm, background: `${C.w}08`, border: `1px solid ${C.w}15` }}>
            Libera momento en tope de columnas (M=0 en aleros)
          </div>
        )}
      </Section>

      <Section title="Pandeo columna">
        <div className="text-[10px] rounded px-1.5 py-1 mb-1" style={{ color: C.dm, background: `${C.ac}08` }}>
          Puntal interior: diagonal correa→ala interior columna. Los girts solos no arriostran el ala interior.
        </div>
        <SI l="Puntal int. col." v={geo.arriostCol || 'ninguno'} oc={v => s('arriostCol', v)}
          opts={[
            { v: 'ninguno',  l: `Sin puntal interior (Lb=${geo.he?.toFixed(1)}m)` },
            { v: 'mitad',    l: `Puntal al medio (${(geo.he / 2).toFixed(1)}m)` },
            { v: 'tercios',  l: `Puntales a tercios (${(geo.he / 3).toFixed(1)}m)` },
            { v: 'custom',   l: 'Custom' },
          ]} />
        {geo.arriostCol === 'custom' && (
          <NI l="Long. no arriostrada" v={geo.arriostColCustom || 2.0} oc={v => s('arriostColCustom', v)} u="m" min={0.5} max={geo.he} step={0.1} />
        )}
        <label className="flex items-center gap-2 text-[10px] cursor-pointer" style={{ color: C.dm }}>
          <input type="checkbox" checked={geo.Kx_col != null}
            onChange={e => s('Kx_col', e.target.checked
              ? (geo.tipoBase === 'empotrada' ? (geo.rotula ? 1.2 : 0.80) : 1.0)
              : null)} />
          <span className="text-xs" style={{ color: C.tx }}>Override K eje fuerte</span>
        </label>
        {geo.Kx_col != null && (
          <NI l="K col. eje fuerte" v={geo.Kx_col} oc={v => s('Kx_col', v)} u="" min={0.5} max={3.0} step={0.05} />
        )}
      </Section>

      <Section title="Tornapuntas rafter (ala inferior)">
        <div className="text-[10px] rounded px-1.5 py-1 mb-1" style={{ color: C.dm, background: `${C.ac}08` }}>
          Tornapuntas: diagonal corta correa→ala inferior. Reduce Lb para succión (ala inf. comprimida).
        </div>
        <SI l="Tornapuntas" v={geo.arriostRafterInf || 'ninguno'} oc={v => s('arriostRafterInf', v)}
          opts={[
            { v: 'ninguno',  l: `Sin tornapuntas (Lb=${Lraf.toFixed(1)}m)` },
            { v: 'mitad',    l: `1 en el centro (Lb=${(Lraf/2).toFixed(1)}m)` },
            { v: 'tercios',  l: `2 en los tercios (Lb=${(Lraf/3).toFixed(1)}m)` },
            { v: 'custom',   l: 'Custom' },
          ]} />
        {geo.arriostRafterInf === 'custom' && (
          <NI l="Sep. tornapuntas" v={geo.arriostRafterInfCustom || 2.0} oc={v => s('arriostRafterInfCustom', v)} u="m" min={0.5} max={Lraf} step={0.1} />
        )}
      </Section>

      <div className="rounded p-2 space-y-1 mt-1"
        style={{ background: `${C.ac}08`, border: `1px solid ${C.ac}20` }}>
        <InfoRow l="Sep. pórticos" v={sep.toFixed(2)} u="m" color={C.tx} />
        <InfoRow l="Ángulo faldón θ" v={theta.toFixed(1)} u="°" color={C.tx} />
        <InfoRow l="Área planta" v={(geo.B * geo.L).toFixed(0)} u="m²" color={C.tx} />
        <InfoRow l="L rafter" v={Lraf.toFixed(2)} u="m" color={C.tx} />
        <InfoRow l="Pendiente" v={(Math.tan(theta * Math.PI / 180) * 100).toFixed(1)} u="%" color={C.tx} />
        {(() => {
          const Kdef = geo.tipoBase === 'empotrada' ? (geo.rotula ? 1.2 : 0.80) : 1.0;
          const K = geo.Kx_col != null ? geo.Kx_col : Kdef;
          let Ly;
          switch (geo.arriostCol) {
            case 'mitad':   Ly = geo.he / 2; break;
            case 'tercios': Ly = geo.he / 3; break;
            case 'custom':  Ly = geo.arriostColCustom || geo.he; break;
            default:        Ly = geo.he; break; // 'ninguno'
          }
          return (<>
            <InfoRow l="KLx col (eje fuerte)" v={`${K.toFixed(2)} × ${geo.he.toFixed(1)} = ${(K * geo.he).toFixed(2)}`} u="m" color={C.tx} />
            <InfoRow l="KLy col (eje débil)" v={`1.0 × ${Ly.toFixed(1)} = ${Ly.toFixed(2)}`} u="m" color={C.tx} />
          </>);
        })()}
      </div>
    </div>
  );
}

// ── Tab Cargas ───────────────────────────────────────────────────────────────

function TabCargas({ geo, loadInp, setLoadInp, windMode, setWindMode, windInp, setWindInp, windCalc, enclosure, setEnclosure, result }) {
  const s  = (k, v) => setLoadInp(p => ({ ...p, [k]: v }));
  const sw = (k, v) => setWindInp(p => ({ ...p, [k]: v }));
  const [autoCorrea, setAutoCorrea] = useState(true);

  const sep       = geo.L / (geo.nPorticos - 1);
  const theta_deg = Math.atan2(geo.hc - geo.he, geo.B / 2) * 180 / Math.PI;
  const bridging  = loadInp.bridgingCorrea || 'cladding';

  // Tipo de cubierta → auto-fill D_cubierta
  const handleCubierta = (tipoId) => {
    s('cubierTipo', tipoId);
    const t = TIPOS_CUBIERTA.find(t => t.id === tipoId);
    if (t && tipoId !== 'custom') s('D_cubierta', t.peso);
  };

  // Correa peso → contribución a D
  const correaData = CORREAS_TIPO.find(c => c.id === (loadInp.correaTipo || 'C200x60x20x2.5'));
  const D_correa = correaData?.peso
    ? +(correaData.peso / Math.max(geo.sepCorreas || 1.5, 0.1)).toFixed(4)
    : 0;

  // ── Auto-selección de correa ──────────────────────────────────────────────
  const W_uplift = Math.max(
    Math.abs(loadInp.W_barlovento_raf || 0),
    Math.abs(loadInp.W_sotavento_raf  || 0),
  );
  const correaAuto = useMemo(() => {
    const viables = CORREAS_TIPO.filter(c => c.id !== 'custom' && c.Ix);
    const D_val = loadInp.D || 0.15;
    const Lr_val = loadInp.Lr || 0.25;
    for (const c of viables) {
      try {
        const r = verificarCorrea(c, D_val, Lr_val, geo.sepCorreas, sep, theta_deg, bridging, W_uplift);
        if (r?.pasa) return { correa: c, ver: r };
      } catch { /* skip */ }
    }
    // Ninguna pasa: devolver la más pesada disponible
    const last = viables[viables.length - 1];
    try {
      const r = verificarCorrea(last, D_val, Lr_val, geo.sepCorreas, sep, theta_deg, bridging, W_uplift);
      return { correa: last, ver: r };
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadInp.D, loadInp.Lr, W_uplift, bridging, geo.sepCorreas, sep, theta_deg]);

  // Sincronizar correa auto-seleccionada → loadInp.correaTipo
  useEffect(() => {
    if (autoCorrea && correaAuto?.correa) {
      s('correaTipo', correaAuto.correa.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCorrea, correaAuto?.correa?.id]);

  // Carga muerta total
  const D_total = (
    (loadInp.D_cubierta   || 0) +
    D_correa                    +
    (loadInp.D_aislacion  || 0) +
    (loadInp.D_estructura || 0) +
    (loadInp.D_instalac   || 0) +
    (loadInp.D_extra      || 0)
  );

  // Lr con clasificación liviana/pesada — CIRSOC 101-2025 Art. 4.8
  // Área tributaria del rafter (horizontal)
  const At = (geo.B / 2) * sep;
  const Lr_result = useMemo(() => calcRoofLiveLoad({
    At,
    theta: theta_deg,
    pesoTotal: D_total,
  }), [At, theta_deg, D_total]);

  // Sincronizar D total cuando cambia
  useEffect(() => {
    s('D', +D_total.toFixed(3));
  }, [D_total]);

  // Sincronizar Lr auto si no está en modo manual
  useEffect(() => {
    if (!loadInp.LrManual) {
      s('Lr', Lr_result.Lr);
    }
  }, [Lr_result.Lr, loadInp.LrManual]);

  // Sincronizar viento CIRSOC 102
  useEffect(() => {
    if (windMode === '102' && windCalc) {
      s('W_barlovento_col', windCalc.pressures.W_barlovento_col);
      s('W_sotavento_col',  windCalc.pressures.W_sotavento_col);
      s('W_barlovento_raf', windCalc.pressures.W_barlovento_raf);
      s('W_sotavento_raf',  windCalc.pressures.W_sotavento_raf);
    }
  }, [windCalc, windMode]);

  return (
    <div className="space-y-1.5">
      {/* ── Carga Muerta ── */}
      <Section title="D — Carga Muerta">
        {/* Cubierta: selector + peso (solo editable si custom) */}
        <SI l="Cubierta" v={loadInp.cubierTipo || 'chapa_galv'} oc={handleCubierta}
          opts={TIPOS_CUBIERTA.map(t => ({ v: t.id, l: `${t.nombre} — ${t.peso} kN/m²` }))} />
        {(loadInp.cubierTipo === 'custom') && (
          <NI l="Peso cubierta" v={loadInp.D_cubierta || 0} oc={v => s('D_cubierta', v)} u="kN/m²" min={0} max={3} step={0.01} />
        )}

        {/* Arriostramiento correas (bridging) — afecta selección de correa */}
        <SI l="Arriostramiento correa" v={bridging} oc={v => s('bridgingCorrea', v)}
          opts={[
            { v: 'cladding', l: 'Chapeado (típico, sin tirillas)' },
            { v: 'third',    l: 'Tirillas en tercios de vano' },
            { v: 'half',     l: 'Tirilla en medio vano' },
            { v: 'none',     l: 'Sin arriostramiento lateral' },
          ]} />
        <div className="text-[10px] rounded px-1.5 py-0.5" style={{ color: C.dm, background: `${C.ac}08` }}>
          {bridging === 'cladding'
            ? 'Ala sup. arriostrada por chapeado → φMn completo (ala inf. libre en succión)'
            : bridging === 'third'
              ? 'Tirillas a los tercios → Lb=L/3 — mejor resistencia a succión'
              : bridging === 'half'
                ? 'Tirilla al medio → Lb=L/2 — protección moderada'
                : 'Sin tirillas — Lb=L — mayor reducción por LTB bajo succión'}
        </div>

        {/* Correa: auto-propuesta o manual */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold" style={{ color: C.dm }}>Correa de techo</span>
            <label className="flex items-center gap-1.5 text-[10px] cursor-pointer" style={{ color: autoCorrea ? C.ac : C.dm }}>
              <input type="checkbox" checked={autoCorrea}
                onChange={e => setAutoCorrea(e.target.checked)} />
              Auto
            </label>
          </div>
          {autoCorrea ? (
            <div className="flex items-center justify-between rounded px-2 py-1"
              style={{ background: `${C.ac}10`, border: `1px solid ${C.ac}25` }}>
              <span className="text-xs font-mono font-bold" style={{ color: C.ok }}>
                {correaAuto?.correa?.nombre || '—'}
              </span>
              {correaAuto?.ver && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: correaAuto.ver.pasa ? `${C.ok}20` : `${C.pos}20`,
                    color: correaAuto.ver.pasa ? C.ok : C.pos,
                  }}>
                  {correaAuto.ver.pasa ? 'OK' : 'NO'}
                </span>
              )}
            </div>
          ) : (
            <SI l="" v={loadInp.correaTipo || 'C200x60x20x2.5'} oc={v => s('correaTipo', v)}
              opts={CORREAS_TIPO.filter(c => c.id !== 'custom').map(c => ({ v: c.id, l: c.nombre }))} />
          )}
          <div className="text-[10px] flex justify-between mt-0.5" style={{ color: C.dm }}>
            <span>Peso correa / sep. correas</span>
            <span className="font-mono">{D_correa.toFixed(4)} kN/m²</span>
          </div>
        </div>

        {/* Aislación — colapsable */}
        <CollapseBlock
          label="Aislación / Revestimiento"
          hint="— interior, membrana, barrera de vapor"
          checked={!!loadInp.incAislacion}
          onToggle={v => { s('incAislacion', v); if (!v) s('D_aislacion', 0); }}>
          <NI l="Peso aislación" v={loadInp.D_aislacion || 0} oc={v => s('D_aislacion', v)} u="kN/m²" min={0} max={1} step={0.01} />
        </CollapseBlock>

        {/* Estructura soporte secundaria — colapsable */}
        <CollapseBlock
          label="Estructura de soporte"
          hint="— arriostr., tensores, cabriadas"
          checked={!!loadInp.incEstructura}
          onToggle={v => {
            s('incEstructura', v);
            if (!v) {
              s('D_estructura', 0);
            } else {
              // Pre-rellenar con el valor típico del tipo seleccionado
              const tipo = loadInp.estTipo || 'arriostr_medio';
              const item = CARGAS_ESTRUCTURA.find(c => c.id === tipo);
              if (item) s('D_estructura', item.peso);
            }
          }}>
          <SI l="Tipo" v={loadInp.estTipo || 'arriostr_medio'} oc={v => {
            s('estTipo', v);
            const item = CARGAS_ESTRUCTURA.find(c => c.id === v);
            if (item && item.peso > 0) s('D_estructura', item.peso);
          }} opts={CARGAS_ESTRUCTURA.map(c => ({ v: c.id, l: `${c.nombre} (${c.peso} kN/m²)` }))} />
          <NI l="Peso" v={loadInp.D_estructura || 0} oc={v => s('D_estructura', v)} u="kN/m²" min={0} max={0.5} step={0.01} />
          <div className="text-[10px] rounded px-1.5 py-1 mt-1" style={{ color: C.dm, background: `${C.ac}08`, border: `1px solid ${C.ac}15` }}>
            Valores típicos: tensores livianos 0.03 · cruces X 0.05 · cabriadas &lt;12m 0.08 · cabriadas &gt;12m 0.12 kN/m²
          </div>
        </CollapseBlock>

        {/* Instalaciones suspendidas — colapsable */}
        <CollapseBlock
          label="Instalaciones suspendidas"
          hint="— HVAC, conductos, luminarias"
          checked={!!loadInp.incInstalac}
          onToggle={v => { s('incInstalac', v); if (!v) s('D_instalac', 0); }}>
          <div className="space-y-1">
            {CARGAS_INSTALACIONES.map(inst => (
              <label key={inst.id} className="flex items-center gap-2 text-[10px] cursor-pointer" style={{ color: C.dm }}>
                <input type="checkbox"
                  checked={!!(loadInp.instalacCheck?.[inst.id])}
                  onChange={e => {
                    const newCheck = { ...(loadInp.instalacCheck || {}), [inst.id]: e.target.checked };
                    s('instalacCheck', newCheck);
                    const total = CARGAS_INSTALACIONES.reduce((sum, i) => sum + (newCheck[i.id] ? i.peso : 0), 0);
                    s('D_instalac', +total.toFixed(4));
                  }} />
                <span className="flex-1">{inst.nombre}</span>
                <span className="font-mono">{inst.peso} kN/m²</span>
              </label>
            ))}
          </div>
          <div className="text-[10px] flex justify-between pt-0.5" style={{ borderTop: `1px solid ${C.bd}`, color: C.dm }}>
            <span>Total instalaciones</span>
            <span className="font-mono font-bold" style={{ color: C.tx }}>{(loadInp.D_instalac || 0).toFixed(3)} kN/m²</span>
          </div>
        </CollapseBlock>

        {/* Otros */}
        <NI l="Otros/adicional" v={loadInp.D_extra || 0} oc={v => s('D_extra', v)} u="kN/m²" min={0} max={2} step={0.01} />

        {/* D total */}
        <div className="rounded p-1.5 space-y-0.5" style={{ background: `${C.ok}10`, border: `1px solid ${C.ok}30` }}>
          <div className="flex justify-between text-[10px]">
            <span style={{ color: C.dm }}>Cubierta</span>
            <span className="font-mono">{(loadInp.D_cubierta || 0).toFixed(3)} kN/m²</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span style={{ color: C.dm }}>Correa / sep</span>
            <span className="font-mono">{D_correa.toFixed(3)} kN/m²</span>
          </div>
          {loadInp.incAislacion && (
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.dm }}>Aislación</span>
              <span className="font-mono">{(loadInp.D_aislacion || 0).toFixed(3)} kN/m²</span>
            </div>
          )}
          {loadInp.incEstructura && (
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.dm }}>Estructura</span>
              <span className="font-mono">{(loadInp.D_estructura || 0).toFixed(3)} kN/m²</span>
            </div>
          )}
          {loadInp.incInstalac && (
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.dm }}>Instalaciones</span>
              <span className="font-mono">{(loadInp.D_instalac || 0).toFixed(3)} kN/m²</span>
            </div>
          )}
          {(loadInp.D_extra || 0) > 0 && (
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.dm }}>Otros</span>
              <span className="font-mono">{(loadInp.D_extra || 0).toFixed(3)} kN/m²</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs pt-0.5 mt-0.5"
            style={{ borderTop: `1px solid ${C.ok}30` }}>
            <span className="font-bold" style={{ color: C.ok }}>D total</span>
            <span className="font-mono font-bold text-sm" style={{ color: C.ok }}>{D_total.toFixed(3)} kN/m²</span>
          </div>
        </div>
        {result?.perfilColumna && result?.perfilRafter ? (
          <div className="text-[10px] rounded px-1.5 py-1 space-y-0.5" style={{ color: C.dm, background: `${C.ok}08`, border: `1px solid ${C.ok}20` }}>
            <div className="font-semibold" style={{ color: C.ok }}>PP perfiles (incluido en D automáticamente)</div>
            <div className="flex justify-between">
              <span>Columna {result.perfilColumna.nombre}</span>
              <span className="font-mono">{result.perfilColumna.peso} kg/m = {(result.perfilColumna.peso * 9.81 / 1000).toFixed(3)} kN/m</span>
            </div>
            <div className="flex justify-between">
              <span>Rafter {result.perfilRafter.nombre}</span>
              <span className="font-mono">{result.perfilRafter.peso} kg/m = {(result.perfilRafter.peso * 9.81 / 1000).toFixed(3)} kN/m</span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] rounded px-1.5 py-1" style={{ color: C.dm, background: `${C.w}08`, border: `1px solid ${C.w}15` }}>
            PP vigas/columnas se agrega automáticamente al resolver (peso propio de perfiles seleccionados).
          </div>
        )}
      </Section>

      {/* ── Carga muerta de pared ── */}
      <Section title="D_pared — Carga muerta pared">
        <label className="flex items-center gap-2 text-[10px] cursor-pointer mb-1.5" style={{ color: C.dm }}>
          <input type="checkbox" checked={!!loadInp.D_pared_activa}
            onChange={e => s('D_pared_activa', e.target.checked)} />
          <span>Tiene chapas y correas de pared</span>
        </label>
        {loadInp.D_pared_activa && (
          <div className="space-y-1">
            <NI l="D pared" v={loadInp.D_pared || 0} oc={v => s('D_pared', v)} u="kN/m²" min={0} max={2} step={0.01} />
            <div className="rounded p-1.5" style={{ background: `${C.ok}10`, border: `1px solid ${C.ok}30` }}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold" style={{ color: C.ok }}>D pared total</span>
                <span className="font-mono font-bold text-sm" style={{ color: C.ok }}>{(loadInp.D_pared || 0).toFixed(3)} kN/m²</span>
              </div>
            </div>
            <div className="text-[10px] rounded px-1.5 py-1" style={{ color: C.dm, background: `${C.ac}08`, border: `1px solid ${C.ac}15` }}>
              Se aplica como carga axial en columnas (chapas + correas de pared).
            </div>
          </div>
        )}
      </Section>

      {/* ── Sobrecarga techo Lr ── */}
      <Section title="Lr — Sobrecarga techo">
        <div className="rounded p-1.5 space-y-0.5 text-[10px]"
          style={{ background: `${C.ac}08`, border: `1px solid ${C.ac}20` }}>
          <div className="flex justify-between">
            <span style={{ color: C.dm }}>Cubierta</span>
            <span className="font-mono font-bold" style={{ color: D_total <= 0.5 ? C.ok : C.w }}>
              {D_total <= 0.5 ? 'Liviana' : 'Pesada'} ({D_total.toFixed(2)} kN/m²)
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: C.dm }}>At = (B/2)×sep</span>
            <span className="font-mono">{At.toFixed(1)} m²</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: C.dm }}>R1 (área)</span>
            <span className="font-mono">{Lr_result.R1}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: C.dm }}>R2 (pendiente {(Math.tan(theta_deg*Math.PI/180)*100).toFixed(0)}%)</span>
            <span className="font-mono">{Lr_result.R2}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span style={{ color: C.ac }}>Lr = {Lr_result.coef}×R1×R2</span>
            <span className="font-mono" style={{ color: C.ac }}>{Lr_result.Lr} kN/m²</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer" style={{ color: C.dm }}>
            <input type="checkbox" checked={!!loadInp.LrManual}
              onChange={e => s('LrManual', e.target.checked)} />
            Manual
          </label>
          {loadInp.LrManual
            ? <NI l="Lr" v={loadInp.Lr || Lr_result.Lr} oc={v => s('Lr', v)} u="kN/m²" min={0} max={2} step={0.01} />
            : <span className="text-xs font-mono font-bold ml-auto" style={{ color: C.ok }}>{(loadInp.Lr || Lr_result.Lr).toFixed(3)} kN/m²</span>
          }
        </div>
      </Section>

      {/* ── Viento ── */}
      <Section title="Viento" accent={C.w}>
        <div className="flex gap-1 mb-1.5">
          {['102', 'manual'].map(m => (
            <button key={m} onClick={() => setWindMode(m)}
              className="flex-1 py-1 rounded text-[10px] font-bold"
              style={{
                background: windMode === m ? `${C.w}25` : C.cd,
                color: windMode === m ? C.w : C.dm,
                border: `1px solid ${windMode === m ? C.w : C.bd}`,
              }}>
              {m === '102' ? 'CIRSOC 102' : 'Manual'}
            </button>
          ))}
        </div>

        {windMode === '102' ? (
          <>
            <SI l="Localidad" v={windInp.localidad} oc={v => sw('localidad', v)}
              opts={LOCALIDADES.map(l => ({ v: l, l }))} />
            <SI l="Cat. Riesgo" v={windInp.riesgo} oc={v => sw('riesgo', v)}
              opts={Object.entries(CAT_RIESGO).map(([k, r]) => ({ v: k, l: `${k} — ${r.d}` }))} />
            <SI l="Exposición" v={windInp.exposicion} oc={v => sw('exposicion', v)}
              opts={[{ v: 'B', l: 'B — Urbana' }, { v: 'C', l: 'C — Abierto' }, { v: 'D', l: 'D — Costera' }]} />
            <NI l="Altitud" v={windInp.altitud || 0} oc={v => sw('altitud', v)} u="m.s.n.m." min={0} max={5000} step={50} />
            <NI l="Kzt (terreno)" v={windInp.Kzt || 1.0} oc={v => sw('Kzt', v)} u="" min={1} max={3} step={0.1} />

            {/* Tipo de cerramiento → GCpi */}
            <SI l="Cerramiento" v={enclosure} oc={v => setEnclosure(v)}
              opts={[
                { v: 'cerrado',              l: 'Cerrado — GCpi ±0.18' },
                { v: 'parcialmente_cerrado', l: 'Parc. cerrado — GCpi ±0.55' },
                { v: 'parcialmente_abierto', l: 'Parc. abierto — GCpi ±0.18' },
                { v: 'abierto',              l: 'Abierto — GCpi 0' },
              ]} />
            {windCalc && (
              <div className="text-[10px] flex justify-between px-1" style={{ color: C.dm }}>
                <span>GCpi en uso</span>
                <span className="font-mono font-bold" style={{ color: C.w }}>±{windCalc.GCpi.toFixed(2)}</span>
              </div>
            )}

            {windCalc && (
              <div className="rounded p-1.5 space-y-0.5 mt-1"
                style={{ background: `${C.w}08`, border: `1px solid ${C.w}25` }}>
                <InfoRow l="V básica (LRFD)" v={windCalc.V.toFixed(1)} u="m/s" color={C.w} />
                <InfoRow l="V servicio (V300)" v={windCalc.V_service?.toFixed(1)} u="m/s" color={C.dm} />
                <InfoRow l="Kz (alero)" v={windCalc.Kz.toFixed(4)} />
                <InfoRow l="Ke" v={windCalc.Ke.toFixed(4)} />
                <InfoRow l="qh (LRFD)" v={(windCalc.qh * 1000).toFixed(1)} u="Pa" color={C.w} />
                <InfoRow l="qh (servicio)" v={(windCalc.qh_service * 1000).toFixed(1)} u="Pa" color={C.dm} />
                <div className="pt-0.5 mt-0.5" style={{ borderTop: `1px solid ${C.bd}` }}>
                  <InfoRow l="W col. BV" v={windCalc.pressures.W_barlovento_col.toFixed(3)} u="kN/m²" />
                  <InfoRow l="W col. SV" v={windCalc.pressures.W_sotavento_col.toFixed(3)} u="kN/m²" />
                  <InfoRow l="W raf. BV" v={windCalc.pressures.W_barlovento_raf.toFixed(3)} u="kN/m²" />
                  <InfoRow l="W raf. SV" v={windCalc.pressures.W_sotavento_raf.toFixed(3)} u="kN/m²" />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <NI l="BV pared" v={loadInp.W_barlovento_col} oc={v => s('W_barlovento_col', v)} u="kN/m²" min={-3} max={3} step={0.01} />
            <NI l="SV pared" v={loadInp.W_sotavento_col} oc={v => s('W_sotavento_col', v)} u="kN/m²" min={-3} max={3} step={0.01} />
            <NI l="BV cubierta" v={loadInp.W_barlovento_raf} oc={v => s('W_barlovento_raf', v)} u="kN/m²" min={-3} max={3} step={0.01} />
            <NI l="SV cubierta" v={loadInp.W_sotavento_raf} oc={v => s('W_sotavento_raf', v)} u="kN/m²" min={-3} max={3} step={0.01} />
            <div className="text-[10px] mt-1 rounded p-1.5" style={{ background: `${C.w}08`, border: `1px solid ${C.w}20`, color: C.w }}>
              Presiones positivas = sobre la superficie. Signos: BV pared (+), cubierta típica (−).
            </div>
          </>
        )}
      </Section>

      {/* ── Costos ── */}
      <Section title="Costos (opcional)">
        <NI l="Precio acero" v={loadInp.precioAceroKg || 0} oc={v => s('precioAceroKg', v)} u="USD/kg" min={0} max={50} step={0.1} />
        <NI l="Precio chapa" v={loadInp.precioChapaKg || 0} oc={v => s('precioChapaKg', v)} u="USD/kg" min={0} max={50} step={0.1} />
      </Section>
    </div>
  );
}

// ── Sidebar principal ────────────────────────────────────────────────────────

const STABS = [
  { id: 'geo',  ic: Building2, l: 'Geometría' },
  { id: 'carg', ic: Wind,      l: 'Cargas'    },
];

export function Sidebar301({
  geo, setGeo,
  loadInp, setLoadInp,
  windMode, setWindMode,
  windInp, setWindInp,
  windCalc,
  enclosure, setEnclosure,
  collapsed, setCollapsed,
  result,
}) {
  const [stab, setStab] = useState('geo');

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-3 shrink-0"
        style={{ width: 44, background: C.sb, borderRight: `1px solid ${C.bd}` }}>
        <button onClick={() => setCollapsed(false)} className="p-1.5 rounded" style={{ color: C.dm }}>
          <Menu size={16} />
        </button>
        {STABS.map(t => (
          <t.ic key={t.id} size={14}
            style={{ color: stab === t.id ? C.ac : C.dm, cursor: 'pointer' }}
            onClick={() => { setCollapsed(false); setStab(t.id); }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col shrink-0 overflow-hidden"
      style={{ width: 300, background: C.sb, borderRight: `1px solid ${C.bd}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: `1px solid ${C.bd}` }}>
        <div className="flex items-center gap-1.5">
          <Factory size={14} style={{ color: C.ac }} />
          <span className="text-xs font-bold" style={{ color: C.tx }}>CIRSOC 301-2018</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="p-1 rounded" style={{ color: C.dm }}>
          <Menu size={14} />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex shrink-0" style={{ borderBottom: `1px solid ${C.bd}` }}>
        {STABS.map(t => (
          <button key={t.id} onClick={() => setStab(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1.5"
            style={{
              color: stab === t.id ? C.ac : C.dm,
              borderBottom: stab === t.id ? `2px solid ${C.ac}` : '2px solid transparent',
              fontSize: 9,
            }}>
            <t.ic size={12} /><span>{t.l}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {stab === 'geo' && <TabGeo geo={geo} setGeo={setGeo} />}
        {stab === 'carg' && (
          <TabCargas
            geo={geo}
            loadInp={loadInp} setLoadInp={setLoadInp}
            windMode={windMode} setWindMode={setWindMode}
            windInp={windInp} setWindInp={setWindInp}
            windCalc={windCalc}
            enclosure={enclosure ?? 'cerrado'} setEnclosure={setEnclosure ?? (() => {})}
            result={result}
          />
        )}
      </div>
    </div>
  );
}
