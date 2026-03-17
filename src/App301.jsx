/**
 * App301.jsx — Módulo CIRSOC 301: Predimensionado de Naves Industriales
 * Layout: Sidebar (Geometría + Cargas) | Área principal (tabs)
 */
import { useState, useMemo, useCallback, useEffect, Component } from 'react';
import { C } from './ui/common/theme.js';

class ErrorBoundary301 extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, color: '#f87171', fontFamily: 'monospace', background: '#1a1a2e' }}>
          <b>Error en CIRSOC 301:</b><br />
          {this.state.err.message}<br /><br />
          <pre style={{ fontSize: 10, opacity: 0.7 }}>{this.state.err.stack?.slice(0, 600)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { NaveSVG2D } from './cirsoc301/ui/NaveSVG2D.jsx';
import { NaveSVG3D } from './cirsoc301/ui/NaveSVG3D.jsx';
import { MaterialTable } from './cirsoc301/ui/MaterialTable.jsx';
import { Sidebar301 } from './cirsoc301/ui/Sidebar301.jsx';
import { TabMemoria } from './cirsoc301/ui/TabMemoria.jsx';
import { TabDiagramas } from './cirsoc301/ui/TabDiagramas.jsx';
import { predimensionar } from './cirsoc301/core/predesign.js';
import { calcularFundaciones } from './cirsoc301/core/foundations.js';
import { SUELOS_ARG } from './cirsoc301/data/suelos.js';
import { computeWindLoads } from './cirsoc301/core/windIntegration.js';
import { verificarCorrea } from './cirsoc301/core/correaDesign.js';
import { PERFILES_W, Fy, Fu, E } from './cirsoc301/data/perfilesW.js';
import { CORREAS_TIPO } from './cirsoc101/data/correas.js';
import { TIPOS_CUBIERTA } from './cirsoc101/data/cubiertas.js';

// ── Notación AISC (americana): W[profundidad_pulg]×[peso_lb/ft] ──────────────
function aisc(perfil) {
  if (!perfil?.d || !perfil?.peso) return '';
  const depthIn   = Math.round(perfil.d / 25.4);
  const weightLbft = Math.round(perfil.peso * 0.6720);
  return `W${depthIn}×${weightLbft}`;
}

// ── Tabs principales ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen',    label: 'Resumen'     },
  { id: 'diseno',     label: 'Diseño'      },
  { id: 'diagramas',  label: 'Diagramas'   },
  { id: 'memoria',    label: 'Memoria'     },
  { id: 'fundaciones', label: 'Fundaciones' },
];

// ── Helpers locales ───────────────────────────────────────────────────────────

function NumInp({ label, unit, value, onChange, min, max, step = 1, disabled }) {
  return (
    <label className="flex items-center gap-2 text-xs" style={{ color: C.dm }}>
      <span className="w-40 text-right">{label}</span>
      <input type="number" value={value} min={min} max={max} step={step} disabled={disabled}
        onChange={e => onChange(+e.target.value)}
        className="w-24 px-2 py-1 rounded text-right text-xs font-mono"
        style={{ background: C.sb, color: C.tx, border: `1px solid ${C.bd}` }} />
      {unit && <span className="text-[10px]" style={{ color: C.dm }}>{unit}</span>}
    </label>
  );
}

function SelInp({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-xs" style={{ color: C.dm }}>
      <span className="w-40 text-right">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="px-2 py-1 rounded text-xs flex-1"
        style={{ background: C.sb, color: C.tx, border: `1px solid ${C.bd}` }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function StatusBadge({ label, color }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

function ResultRow({ label, value, unit, ok, warn }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1" style={{ borderBottom: `1px solid ${C.bd}22` }}>
      <span className="w-44" style={{ color: C.dm }}>{label}</span>
      <span className="font-mono font-bold" style={{ color: warn ? C.pos : ok ? C.ok : C.tx }}>{value}</span>
      {unit && <span style={{ color: C.dm }}>{unit}</span>}
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────

function App301Inner() {
  const [tab, setTab] = useState('resumen');
  const [collapsed, setCollapsed] = useState(false);
  const [diagComboId, setDiagComboId] = useState(null); // combo pre-seleccionado desde Diseño

  // ── Estado geometría ──
  const [geo, setGeo] = useState({
    B: 20, L: 50, he: 8, hc: 9,
    nPorticos: 8, sepCorreas: 1.0,
    tipoBase: 'empotrada',
    sepGirts: 1.0,           // separación entre girts de pared [m]
    rotula: false,           // rótula en encuentro columna-viga (M=0 en alero)
    Kx_col: null,            // override K eje fuerte (null = default según tipoBase+rotula)
    arriostCol: 'ninguno',   // arriostramiento eje débil col interior: 'ninguno'|'mitad'|'tercios'|'custom'
    arriostColCustom: 2.0,   // longitud custom [m] (solo si arriostCol === 'custom')
    arriostRafterInf: 'ninguno', // tornapuntas ala inf rafter: 'ninguno'|'mitad'|'tercios'|'custom'
    arriostRafterInfCustom: 2.0, // separación tornapuntas custom [m]
  });

  // ── Estado cargas ──
  const defaultCubierta = TIPOS_CUBIERTA.find(t => t.id === 'chapa_galv');
  const [loadInp, setLoadInp] = useState({
    // Carga muerta desglosada
    cubierTipo: 'chapa_galv',
    D_cubierta:    defaultCubierta?.peso ?? 0.10,
    D_aislacion:   0,
    D_estructura:  0,
    incEstructura: false,
    estTipo:       'arriostr_medio',
    D_extra:       0,
    D:             defaultCubierta?.peso ?? 0.10,
    // Carga muerta de pared (chapas + correas de pared)
    D_pared:        0.10,
    D_pared_activa: true,
    // Sobrecarga
    Lr: 0.60,
    correaTipo: 'C200x60x20x2.5',
    bridgingCorrea: 'cladding',  // arriostramiento ala inferior correa para verificación por succión
    // Viento (manual default)
    W_barlovento_col:  0.50,
    W_sotavento_col:  -0.30,
    W_barlovento_raf: -0.40,
    W_sotavento_raf:  -0.30,
    // Costos
    precioAceroKg: 5.8,
    precioChapaKg: 2.0,
  });

  // ── Estado viento CIRSOC 102 ──
  const [windMode, setWindMode] = useState('102'); // 'manual' | '102'
  const [enclosure, setEnclosure] = useState('cerrado'); // tipo de cerramiento para GCpi
  const [windInp, setWindInp] = useState({
    localidad: 'Rosario',
    riesgo: 'II',
    exposicion: 'C',
    altitud: 0,
    Kzt: 1.0,
  });

  // ── Estado fundaciones ──
  const [fundInp, setFundInp] = useState({
    tipoFund: 'superficial',
    sueloId: 'limo_pampa_media',
    cotaFund: 1.5,
    // Parámetros del suelo (auto-filled desde preset o editables)
    c: 25, phi: 18, gamma: 17.5,
    // Pilotes
    tauFric: 28, qTip: 300,
    D_pilote: 0.40, L_pilote: 8,
  });

  // ── Override de perfiles ──
  const [overrideCol, setOverrideCol] = useState(null);
  const [overrideRaf, setOverrideRaf] = useState(null);

  // ── Cálculo de viento CIRSOC 102 ──
  const windCalc = useMemo(() => {
    if (windMode !== '102') return null;
    try {
      const theta_deg = Math.atan2(geo.hc - geo.he, geo.B / 2) * 180 / Math.PI;
      return computeWindLoads({
        localidad:  windInp.localidad,
        riesgo:     windInp.riesgo,
        exposicion: windInp.exposicion,
        altitud:    windInp.altitud || 0,
        Kzt:        windInp.Kzt || 1.0,
        theta_deg,
        he: geo.he,
        hc: geo.hc,
        B: geo.B,
        L: geo.L,
        enclosure,
      });
    } catch { return null; }
  }, [windMode, windInp, geo.hc, geo.he, geo.B, geo.L, enclosure]);

  // Sincronizar presiones viento desde CIRSOC 102 → loadInp
  // Incluye presiones LRFD (V700) y de servicio (V300) para verificación de derivas
  useEffect(() => {
    if (windMode === '102' && windCalc) {
      setLoadInp(p => ({
        ...p,
        // Presiones W1 LRFD (para combinaciones de resistencia)
        W_barlovento_col: windCalc.pressures_W1.W_barlovento_col,
        W_sotavento_col:  windCalc.pressures_W1.W_sotavento_col,
        W_barlovento_raf: windCalc.pressures_W1.W_barlovento_raf,
        W_sotavento_raf:  windCalc.pressures_W1.W_sotavento_raf,
        // Presiones W2 LRFD (paralelo a cumbrera)
        W2_col: windCalc.pressures_W2.W_col,
        W2_raf: windCalc.pressures_W2.W_raf,
        // Presiones de servicio W1 (V50, para ELS y verificación de derivas H/150)
        W_barlovento_col_service: windCalc.pressures_W1_service?.W_barlovento_col,
        W_sotavento_col_service:  windCalc.pressures_W1_service?.W_sotavento_col,
        W_barlovento_raf_service: windCalc.pressures_W1_service?.W_barlovento_raf,
        W_sotavento_raf_service:  windCalc.pressures_W1_service?.W_sotavento_raf,
        // Presiones de servicio W2 (V50)
        W2_col_service: windCalc.pressures_W2_service?.W_col,
        W2_raf_service: windCalc.pressures_W2_service?.W_raf,
      }));
    }
  }, [windCalc, windMode]);

  // ── Cálculo predimensionado ──
  const result = useMemo(() => {
    try { return predimensionar(geo, loadInp, { colId: overrideCol, rafId: overrideRaf }); }
    catch (e) { console.error('Error predimensionado:', e); return null; }
  }, [geo, loadInp, overrideCol, overrideRaf]);

  const perfilCol = result?.perfilColumna;
  const perfilRaf = result?.perfilRafter;

  // ── Cálculo fundaciones ──
  const fundResult = useMemo(() => {
    if (!result) return null;
    try { return calcularFundaciones({ envolvente: result.envolvente, geo, fundInp }); }
    catch (e) { console.error('Error fundaciones:', e); return null; }
  }, [result, geo, fundInp]);

  // ── Auto-selección de perfil óptimo ──
  const handleAutoCol = useCallback(() => {
    // Anclar rafter al perfil actualmente mostrado para consistencia estructural
    const fixedRafId = overrideRaf || result?.perfilRafter?.id;
    const sorted = [...PERFILES_W].sort((a, b) => a.peso - b.peso);
    for (const p of sorted) {
      try {
        const r = predimensionar(geo, loadInp, { colId: p.id, rafId: fixedRafId });
        if (r?.verColumna?.pasa && (r?.flechaCheck?.columna?.pasa ?? true)) {
          setOverrideCol(p.id);
          return;
        }
      } catch {}
    }
  }, [geo, loadInp, overrideRaf, result]);

  const handleAutoRaf = useCallback(() => {
    // Anclar columna al perfil actualmente mostrado para consistencia estructural
    const fixedColId = overrideCol || result?.perfilColumna?.id;
    const sorted = [...PERFILES_W].sort((a, b) => a.peso - b.peso);
    for (const p of sorted) {
      try {
        const r = predimensionar(geo, loadInp, { colId: fixedColId, rafId: p.id });
        if (r?.verRafter?.pasa && (r?.flechaCheck?.rafter?.pasa ?? true)) {
          setOverrideRaf(p.id);
          return;
        }
      } catch {}
    }
  }, [geo, loadInp, overrideCol, result]);

  // ── Correa seleccionada ──
  const correa = useMemo(() => {
    const tid = loadInp.correaTipo;
    return CORREAS_TIPO.find(c => c.id === tid) || null;
  }, [loadInp.correaTipo]);

  // ── Verificación de correa ──
  const verCorrea = useMemo(() => {
    if (!correa?.Ix) return null;
    const sep = geo.L / (geo.nPorticos - 1);
    const theta_deg = Math.atan2(geo.hc - geo.he, geo.B / 2) * 180 / Math.PI;
    // Presión de succión máxima en cubierta (valor absoluto) para verificación bajo viento
    const W_uplift = Math.max(
      Math.abs(loadInp.W_barlovento_raf || 0),
      Math.abs(loadInp.W_sotavento_raf  || 0),
    );
    try {
      return verificarCorrea(
        correa, loadInp.D || 0, loadInp.Lr || 0,
        geo.sepCorreas, sep, theta_deg,
        loadInp.bridgingCorrea || 'cladding',
        W_uplift,
      );
    } catch { return null; }
  }, [correa, loadInp.D, loadInp.Lr, loadInp.W_barlovento_raf, loadInp.W_sotavento_raf, loadInp.bridgingCorrea, geo]);

  const sep = geo.L / (geo.nPorticos - 1);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden" style={{ background: C.bg, color: C.tx }}>
      {/* Sidebar */}
      <Sidebar301
        geo={geo} setGeo={setGeo}
        loadInp={loadInp} setLoadInp={setLoadInp}
        windMode={windMode} setWindMode={setWindMode}
        windInp={windInp} setWindInp={setWindInp}
        windCalc={windCalc}
        enclosure={enclosure} setEnclosure={setEnclosure}
        collapsed={collapsed} setCollapsed={setCollapsed}
        result={result}
      />

      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header con status */}
        <div className="flex items-center gap-3 px-4 py-2 shrink-0"
          style={{ borderBottom: `1px solid ${C.bd}`, background: C.sb }}>
          <span className="text-xs font-bold" style={{ color: C.tx }}>
            Nave Industrial — {geo.B}×{geo.L}×{geo.he}/{geo.hc} m
          </span>
          {perfilCol && (
            <span className="text-[10px] font-mono" style={{ color: C.ok }}>
              Col: {perfilCol.nombre}
              <span style={{ color: C.dm }}> ({aisc(perfilCol)})</span>
            </span>
          )}
          {perfilRaf && (
            <span className="text-[10px] font-mono" style={{ color: C.ok }}>
              Raf: {perfilRaf.nombre}
              <span style={{ color: C.dm }}> ({aisc(perfilRaf)})</span>
            </span>
          )}
          {result && (
            <>
              <StatusBadge
                label={result.verColumna?.pasa ? 'Col OK' : 'Col FALLA'}
                color={result.verColumna?.pasa ? C.ok : C.pos} />
              <StatusBadge
                label={result.verRafter?.pasa ? 'Raf OK' : 'Raf FALLA'}
                color={result.verRafter?.pasa ? C.ok : C.pos} />
            </>
          )}
          {windMode === '102' && windCalc && (
            <span className="text-[10px]" style={{ color: C.w }}>
              qh={( windCalc.qh * 1000).toFixed(0)} Pa
            </span>
          )}
          <div className="flex-1" />
          <span className="text-[10px]" style={{ color: C.dm }}>
            sep={sep.toFixed(1)} m | {geo.nPorticos} pórticos | área={(geo.B*geo.L).toFixed(0)} m²
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 px-2 pt-1.5" style={{ borderBottom: `1px solid ${C.bd}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-1.5 text-xs font-semibold rounded-t"
              style={{
                color: tab === t.id ? C.ac : C.dm,
                background: tab === t.id ? C.cd : 'transparent',
                borderBottom: tab === t.id ? `2px solid ${C.ac}` : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          {tab === 'resumen' && (
            <TabResumen geo={geo} result={result} perfilCol={perfilCol} perfilRaf={perfilRaf}
              costInp={{ precioAceroKg: loadInp.precioAceroKg, precioChapaKg: loadInp.precioChapaKg }}
              correa={correa} verCorrea={verCorrea} fundResult={fundResult} />
          )}
          {tab === 'diseno' && (
            <TabDiseno result={result} geo={geo} perfilCol={perfilCol} perfilRaf={perfilRaf}
              overrideCol={overrideCol} overrideRaf={overrideRaf}
              setOverrideCol={setOverrideCol} setOverrideRaf={setOverrideRaf}
              onAutoCol={handleAutoCol} onAutoRaf={handleAutoRaf}
              onGoToDiagram={id => { setDiagComboId(id); setTab('diagramas'); }} />
          )}
          {tab === 'diagramas' && (
            <TabDiagramas result={result} geo={geo} initialComboId={diagComboId}
              windCalc={windMode === '102' ? windCalc : null} />
          )}
          {tab === 'memoria' && (
            <div className="p-4">
              <TabMemoria
                result={result} geo={geo} loadInp={loadInp}
                windCalc={windMode === '102' ? windCalc : null}
                windMode={windMode} windInp={windInp}
                fundResult={fundResult}
                verCorrea={verCorrea} correa={correa} />
            </div>
          )}
          {tab === 'fundaciones' && (
            <TabFundaciones geo={geo} fundInp={fundInp} setFundInp={setFundInp}
              fundResult={fundResult} result={result} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function App301() {
  return <ErrorBoundary301><App301Inner /></ErrorBoundary301>;
}

// ── Tab Resumen ───────────────────────────────────────────────────────────────

function TabResumen({ geo, result, perfilCol, perfilRaf, costInp, correa, verCorrea, fundResult }) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Vista 3D grande */}
        <div className="xl:col-span-2 rounded-lg overflow-hidden"
          style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold" style={{ color: C.dm }}>
            Vista 3D — Nave industrial (arrastrar para rotar · scroll para zoom)
          </div>
          <NaveSVG3D geo={geo} perfilCol={perfilCol} perfilRaf={perfilRaf} fundResult={fundResult} />
        </div>

        {/* Panel lateral de resultados */}
        <div className="space-y-3">
          {/* Quick stats */}
          <div className="rounded-lg p-3 space-y-2"
            style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
            <div className="text-xs font-bold" style={{ color: C.ac }}>Perfiles seleccionados</div>
            <div>
              <div className="text-[10px]" style={{ color: C.dm }}>Columna</div>
              <div className="font-mono font-bold text-xs" style={{ color: C.ok }}>
                {perfilCol?.nombre || '—'}
                {perfilCol && <span className="font-normal text-[10px] ml-1" style={{ color: C.dm }}>({aisc(perfilCol)})</span>}
              </div>
              {result?.verColumna && (
                <div className="text-[10px] space-x-2 mt-0.5">
                  <span style={{ color: C.dm }}>H1:</span>
                  <span className="font-mono" style={{ color: result.verColumna.pasa ? C.ok : C.pos }}>
                    {result.verColumna.ratioH1?.toFixed(3)}
                  </span>
                  <span style={{ color: C.dm }}>φMn:</span>
                  <span className="font-mono" style={{ color: C.tx }}>
                    {result.verColumna.phiMn?.toFixed(0)} kN·m
                  </span>
                </div>
              )}
            </div>
            <div style={{ borderTop: `1px solid ${C.bd}`, paddingTop: 6 }}>
              <div className="text-[10px]" style={{ color: C.dm }}>Rafter</div>
              <div className="font-mono font-bold text-xs" style={{ color: C.ok }}>
                {perfilRaf?.nombre || '—'}
                {perfilRaf && <span className="font-normal text-[10px] ml-1" style={{ color: C.dm }}>({aisc(perfilRaf)})</span>}
              </div>
              {result?.verRafter && (
                <div className="text-[10px] space-x-2 mt-0.5">
                  <span style={{ color: C.dm }}>H1:</span>
                  <span className="font-mono" style={{ color: result.verRafter.pasa ? C.ok : C.pos }}>
                    {result.verRafter.ratioH1?.toFixed(3)}
                  </span>
                  <span style={{ color: C.dm }}>φMn:</span>
                  <span className="font-mono" style={{ color: C.tx }}>
                    {result.verRafter.phiMn?.toFixed(0)} kN·m
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Correa */}
          {correa && (
            <div className="rounded-lg p-3"
              style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
              <div className="text-xs font-bold mb-1.5" style={{ color: C.ac }}>Correa</div>
              <div className="font-mono text-xs font-bold" style={{ color: C.ok }}>{correa.nombre}</div>
              {verCorrea ? (
                <div className="text-[10px] space-y-0.5 mt-1">
                  <div>
                    <span style={{ color: C.dm }}>Gravedad M: </span>
                    <span className="font-mono" style={{ color: verCorrea.pasaM ? C.ok : C.pos }}>
                      {verCorrea.ratioM}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: C.dm }}>Flecha: </span>
                    <span className="font-mono" style={{ color: verCorrea.pasaFlecha ? C.ok : C.pos }}>
                      {verCorrea.ratioFlecha}
                    </span>
                  </div>
                  {verCorrea.uplift && (
                    <div>
                      <span style={{ color: C.dm }}>Succión M: </span>
                      <span className="font-mono" style={{ color: verCorrea.uplift.pasa ? C.ok : C.pos }}>
                        {verCorrea.uplift.ratioM_uplift}
                      </span>
                      <span style={{ color: C.dm }}> (φ={verCorrea.uplift.ltbFactor})</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] mt-1" style={{ color: C.dm }}>Sin propiedades seccionales</div>
              )}
            </div>
          )}

          {/* Flecha */}
          {result?.flechaCheck && (
            <div className="rounded-lg p-3"
              style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
              <div className="text-xs font-bold mb-1.5" style={{ color: C.ac }}>Flechas de servicio</div>
              <div className="text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span style={{ color: C.dm }}>Col. lateral H/150</span>
                  <span className="font-mono" style={{ color: result.flechaCheck.columna.pasa ? C.ok : C.pos }}>
                    {result.flechaCheck.columna.delta.toFixed(0)}/{result.flechaCheck.columna.limite.toFixed(0)} mm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.dm }}>Raf. vert. L/240</span>
                  <span className="font-mono" style={{ color: result.flechaCheck.rafter.pasa ? C.ok : C.pos }}>
                    {result.flechaCheck.rafter.delta.toFixed(0)}/{result.flechaCheck.rafter.limite.toFixed(0)} mm
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vista 2D + tabla materiales */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-lg overflow-hidden"
          style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold" style={{ color: C.dm }}>
            Pórtico tipo — Corte transversal
          </div>
          <NaveSVG2D geo={geo} perfilCol={perfilCol} perfilRaf={perfilRaf}
            verCol={result?.verColumna} verRaf={result?.verRafter}
            correa={correa} />
        </div>

        <div className="rounded-lg p-3"
          style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
          <div className="text-xs font-bold mb-2" style={{ color: C.ac }}>Tabla de materiales</div>
          <MaterialTable geo={geo} perfilCol={perfilCol} perfilRaf={perfilRaf}
            correa={correa} costInp={costInp} />
        </div>
      </div>
    </div>
  );
}

// ── Helpers para Tab Diseño ───────────────────────────────────────────────────

function MemberCard({ title, perfil, ver, env, flechaCheck, flechaLabel, flechaLimite, overrideId, setOverride, onAuto, showZona, onGoToDiagram, selectedCombo, params }) {
  // Display either selected combo values or dominant combo values
  const display = selectedCombo || null;
  const isSelected = !!selectedCombo;

  return (
    <div className="p-4 rounded-lg space-y-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold" style={{ color: C.ac }}>{title}</span>
        <StatusBadge label={ver?.pasa ? 'OK' : 'NO PASA'} color={ver?.pasa ? C.ok : C.pos} />
        {isSelected && (
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: `${C.w}20`, color: C.w, border: `1px solid ${C.w}40` }}>
            {display.nombre}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs mb-1">
        <span className="w-40 text-right" style={{ color: C.dm }} />
        <button onClick={onAuto}
          className="px-2.5 py-0.5 rounded text-[10px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: `${C.ac}22`, color: C.ac, border: `1px solid ${C.ac}55` }}
          title="Buscar el perfil más liviano que verifica H1, corte y flecha">
          ⚡ Auto — menor peso
        </button>
        {overrideId && (
          <button onClick={() => setOverride(null)}
            className="px-2 py-0.5 rounded text-[10px] opacity-60 hover:opacity-90"
            style={{ background: `${C.pos}18`, color: C.pos, border: `1px solid ${C.pos}44` }}
            title="Volver a selección automática por predimensionado">
            ✕ limpiar
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs" style={{ color: C.dm }}>
        <span className="w-40 text-right">Perfil</span>
        <select value={overrideId || perfil?.id || ''}
          onChange={e => setOverride(e.target.value || null)}
          className="flex-1 px-2 py-1 rounded text-xs"
          style={{ background: C.sb, color: C.ok, border: `1px solid ${C.bd}`, fontWeight: 700 }}>
          {!overrideId && <option value="">Auto: {perfil?.nombre}</option>}
          {PERFILES_W.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.peso} kg/m)</option>)}
        </select>
      </div>

      <ResultRow label="Interacción H1"
        value={(isSelected ? display.ratioH1 : ver?.ratioH1)?.toFixed(3)}
        ok={isSelected ? display.pasa : ver?.pasa}
        warn={isSelected ? !display.pasa : !ver?.pasa} />
      {ver?.comboDominante && !isSelected && (
        <div className="flex items-center gap-2 text-[10px] -mt-1 pl-[11.5rem]">
          <span style={{ color: C.w }}>Dominante: {ver.comboDominante}</span>
          {onGoToDiagram && (
            <button
              onClick={() => onGoToDiagram(ver.comboId)}
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{ background: `${C.ac}25`, color: C.ac, border: `1px solid ${C.ac}50` }}
              title="Ver diagrama de esta combinación">
              Ver diagrama →
            </button>
          )}
        </div>
      )}
      {isSelected && (
        <div className="flex items-center gap-2 text-[10px] -mt-1 pl-[11.5rem]">
          <span style={{ color: C.dm }}>Fórmula: <b style={{ color: C.tx }}>{display.formulaH1}</b></span>
          {onGoToDiagram && (
            <button
              onClick={() => onGoToDiagram(display.id)}
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{ background: `${C.w}20`, color: C.w, border: `1px solid ${C.w}40` }}
              title="Ver diagrama de esta combinación">
              Ver diagrama →
            </button>
          )}
        </div>
      )}
      {!isSelected && <ResultRow label="Fórmula" value={ver?.formulaH1} />}
      <ResultRow label="Ratio corte" value={ver?.ratioCorte?.toFixed(3)}
        ok={ver?.ratioCorte <= 1} warn={ver?.ratioCorte > 1} />
      <ResultRow label="φPn" value={ver?.phiPn?.toFixed(0)} unit="kN" />
      <ResultRow label="φMn" value={ver?.phiMn?.toFixed(0)} unit="kN·m" />
      {showZona && <ResultRow label="Zona LTB" value={ver?.zona} />}
      <ResultRow label="KL/r" value={ver?.KLr?.toFixed(1)} />

      <div className="text-[10px] mt-2 space-y-0.5" style={{ color: C.dm }}>
        {isSelected ? (
          <div>
            Nu: <b style={{ color: C.tx }}>{display.N.toFixed(1)} kN</b>
            {' | '}Vu: <b style={{ color: C.tx }}>{display.V.toFixed(1)} kN</b>
            {' | '}Mu: <b style={{ color: C.tx }}>{display.M.toFixed(1)} kN·m</b>
            <span style={{ color: C.dm }}> (combo seleccionada)</span>
          </div>
        ) : (
          <div>Nu: <b>{env.Nmax.toFixed(1)} kN</b> | Vu: <b>{env.Vmax.toFixed(1)} kN</b> | Mu: <b>{env.Mmax.toFixed(1)} kN·m</b></div>
        )}
      </div>

      {flechaCheck && (
        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.bd}` }}>
          <ResultRow label={flechaLabel}
            value={`${flechaCheck.delta.toFixed(1)} / ${flechaCheck.limite.toFixed(1)} mm`}
            ok={flechaCheck.pasa} warn={!flechaCheck.pasa} />
          <div className="text-[10px]" style={{ color: C.dm }}>Límite: {flechaLimite}</div>
        </div>
      )}

      {params && (
        <details className="mt-3 rounded overflow-hidden" style={{ border: `1px solid ${C.bd}` }}>
          <summary className="px-2 py-1 text-[10px] font-semibold cursor-pointer select-none"
            style={{ background: C.sb, color: C.dm, listStyle: 'none' }}>
            Parámetros considerados ▾
          </summary>
          <div className="p-2 space-y-2 text-[10px]" style={{ background: C.cd, color: C.dm }}>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span>Fy = <b style={{ color: C.tx }}>{Fy} MPa</b></span>
              <span>E = <b style={{ color: C.tx }}>200 000 MPa</b></span>
            </div>
            <div className="space-y-0.5">
              <div>
                <span style={{ color: C.dm }}>Eje fuerte: </span>
                <span>K = <b style={{ color: C.tx }}>{params.Kx?.toFixed(2)}</b></span>
                <span className="mx-1" style={{ color: C.dm }}>×</span>
                <span>L = <b style={{ color: C.tx }}>{params.Lx?.toFixed(2)} m</b></span>
                <span className="mx-1.5" style={{ color: C.dm }}>→</span>
                <span>KLx = <b style={{ color: C.ok }}>{params.KLx?.toFixed(2)} m</b></span>
              </div>
              <div>
                <span style={{ color: C.dm }}>Eje débil:&nbsp; </span>
                <span>Ky = <b style={{ color: C.tx }}>1.00</b></span>
                <span className="mx-1" style={{ color: C.dm }}>×</span>
                <span>Ly = <b style={{ color: C.tx }}>{params.Ly?.toFixed(2)} m</b></span>
                <span className="mx-1.5" style={{ color: C.dm }}>→</span>
                <span>KLy = <b style={{ color: C.ok }}>{params.KLy?.toFixed(2)} m</b></span>
              </div>
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
                  {['Ala', 'Lb', 'Comprimida bajo'].map(h => (
                    <th key={h} className="text-left px-1 py-0.5" style={{ color: C.dm }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${C.bd}22` }}>
                  <td className="px-1 py-0.5" style={{ color: C.dm }}>{params.labelExt}</td>
                  <td className="px-1 py-0.5 font-mono font-bold" style={{ color: C.ok }}>{params.Lb_ext?.toFixed(2)} m</td>
                  <td className="px-1 py-0.5" style={{ color: C.dm }}>{params.descExt}</td>
                </tr>
                <tr>
                  <td className="px-1 py-0.5" style={{ color: C.dm }}>{params.labelInt}</td>
                  <td className="px-1 py-0.5 font-mono font-bold" style={{ color: C.ok }}>{params.Lb_int?.toFixed(2)} m</td>
                  <td className="px-1 py-0.5" style={{ color: C.dm }}>{params.descInt}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span>Lp = <b style={{ color: C.ok }}>{ver?.Lp?.toFixed(2) ?? '—'} m</b></span>
              <span>Lr = <b style={{ color: C.ok }}>{ver?.Lr?.toFixed(2) ?? '—'} m</b></span>
              <span>→ zona <b style={{ color: ver?.zona === 'plástica' ? C.ok : ver?.zona === 'inelástica' ? C.w : C.pos }}>{ver?.zona ?? '—'}</b></span>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function ComboTable({ title, combos, comboId, phiPn, phiMn, selectedComboId, onSelectCombo, onGoToDiagram }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold" style={{ color: C.ac }}>{title}</span>
        <span className="text-[10px]" style={{ color: C.dm }}>— clic en fila para inspeccionar</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <th className="text-left px-2 py-1" style={{ color: C.dm }}>Combinación</th>
              <th className="text-right px-2 py-1" style={{ color: C.dm }}>N [kN]</th>
              <th className="text-right px-2 py-1" style={{ color: C.dm }}>V [kN]</th>
              <th className="text-right px-2 py-1" style={{ color: C.dm }}>M [kN·m]</th>
              <th className="text-right px-2 py-1" style={{ color: C.dm }}>N/φPn</th>
              <th className="text-right px-2 py-1" style={{ color: C.dm }}>M/φMn</th>
              <th className="text-right px-2 py-1" style={{ color: C.dm }}>H1</th>
              <th className="text-center px-2 py-1" style={{ color: C.dm }}>Fórmula</th>
              <th className="px-2 py-1" style={{ color: C.dm }}></th>
            </tr>
          </thead>
          <tbody>
            {combos.map(c => {
              const isDom = c.id === comboId;
              const isSel = c.id === selectedComboId;
              const rowBg = isSel ? `${C.w}18` : isDom ? `${C.ac}15` : 'transparent';
              const rowStyle = {
                borderBottom: `1px solid ${C.bd}22`,
                background: rowBg,
                fontWeight: isDom || isSel ? 700 : 400,
                cursor: 'pointer',
                outline: isSel ? `1px solid ${C.w}50` : 'none',
              };
              const color = !c.pasa ? C.pos : isSel ? C.w : isDom ? C.ac : C.tx;
              return (
                <tr key={c.id} style={rowStyle} onClick={() => onSelectCombo?.(c.id)}
                  title={isSel ? 'Clic para deseleccionar' : 'Clic para seleccionar'}>
                  <td className="px-2 py-1 font-mono" style={{ color }}>{c.nombre}</td>
                  <td className="text-right px-2 py-1 font-mono" style={{ color }}>{c.N.toFixed(1)}</td>
                  <td className="text-right px-2 py-1 font-mono" style={{ color }}>{c.V.toFixed(1)}</td>
                  <td className="text-right px-2 py-1 font-mono" style={{ color }}>{c.M.toFixed(1)}</td>
                  <td className="text-right px-2 py-1 font-mono" style={{ color: C.dm }}>{phiPn > 0 ? (c.N / phiPn).toFixed(3) : '—'}</td>
                  <td className="text-right px-2 py-1 font-mono" style={{ color: C.dm }}>{phiMn > 0 ? (c.M / phiMn).toFixed(3) : '—'}</td>
                  <td className="text-right px-2 py-1 font-mono" style={{ color }}>{c.ratioH1.toFixed(3)}</td>
                  <td className="text-center px-2 py-1" style={{ color: C.dm }}>{c.formulaH1}</td>
                  <td className="px-2 py-1 text-center" onClick={e => e.stopPropagation()}>
                    {onGoToDiagram && (
                      <button
                        onClick={() => onGoToDiagram(c.id)}
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap"
                        style={{ background: `${C.ac}20`, color: C.ac, border: `1px solid ${C.ac}40` }}
                        title="Ver diagrama de esta combinación">
                        diag →
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab Diseño ────────────────────────────────────────────────────────────────

function TabDiseno({ result, geo, perfilCol, perfilRaf, overrideCol, overrideRaf, setOverrideCol, setOverrideRaf, onAutoCol, onAutoRaf, onGoToDiagram }) {
  const [selectedComboId, setSelectedComboId] = useState(null);

  if (!result) return (
    <div className="p-4 text-sm" style={{ color: C.pos }}>
      Error en el cálculo. Verificar geometría y cargas.
    </div>
  );

  const { verColumna, verRafter, flechaCheck, envolvente, parametros } = result;

  // Datos de la combinación seleccionada para cada tipo de miembro
  const selComboCol = selectedComboId
    ? verColumna?.allCombos?.find(c => c.id === selectedComboId) : null;
  const selComboRaf = selectedComboId
    ? verRafter?.allCombos?.find(c => c.id === selectedComboId) : null;

  const handleSelectCombo = (id) => setSelectedComboId(prev => prev === id ? null : id);

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columnas */}
        <MemberCard
          title="Columnas" perfil={perfilCol} ver={verColumna} env={envolvente.columna}
          flechaCheck={flechaCheck?.columna} flechaLabel="Flecha lateral (viento)" flechaLimite="H/150"
          overrideId={overrideCol} setOverride={setOverrideCol} onAuto={onAutoCol}
          onGoToDiagram={onGoToDiagram} selectedCombo={selComboCol}
          params={parametros ? {
            Kx: parametros.Kcol, Lx: parametros.Lcolumna, KLx: parametros.KLx_col,
            Ly: parametros.KLy_col, KLy: parametros.KLy_col,
            Lb_ext: parametros.Lb_col_ext, labelExt: 'exterior', descExt: 'gravedad / viento ext.',
            Lb_int: parametros.Lb_col_int, labelInt: 'interior', descInt: 'succión / viento int.',
          } : null} />

        {/* Rafters */}
        <MemberCard
          title="Rafters" perfil={perfilRaf} ver={verRafter} env={envolvente.rafter}
          flechaCheck={flechaCheck?.rafter} flechaLabel="Flecha vertical (D+Lr)" flechaLimite="L/240"
          overrideId={overrideRaf} setOverride={setOverrideRaf} onAuto={onAutoRaf}
          showZona onGoToDiagram={onGoToDiagram} selectedCombo={selComboRaf}
          params={parametros ? {
            Kx: 1.0, Lx: parametros.Lrafter, KLx: parametros.KLx_raf,
            Ly: parametros.KLy_raf, KLy: parametros.KLy_raf,
            Lb_ext: parametros.Lb_rafter_sup, labelExt: 'superior', descExt: 'gravedad (correas)',
            Lb_int: parametros.Lb_rafter_inf, labelInt: 'inferior',
            descInt: `succión (tornapuntas: ${parametros.arriostRafterInf || 'ninguno'})`,
          } : null} />
      </div>

      {/* Tabla de esfuerzos por combinación — Columnas */}
      {verColumna?.allCombos && (
        <ComboTable title="Columnas — Esfuerzos por combinación" combos={verColumna.allCombos}
          comboId={verColumna.comboId} phiPn={verColumna.phiPn} phiMn={verColumna.phiMn}
          selectedComboId={selectedComboId} onSelectCombo={handleSelectCombo}
          onGoToDiagram={onGoToDiagram} />
      )}

      {/* Tabla de esfuerzos por combinación — Rafters */}
      {verRafter?.allCombos && (
        <ComboTable title="Rafters — Esfuerzos por combinación" combos={verRafter.allCombos}
          comboId={verRafter.comboId} phiPn={verRafter.phiPn} phiMn={verRafter.phiMn}
          selectedComboId={selectedComboId} onSelectCombo={handleSelectCombo}
          onGoToDiagram={onGoToDiagram} />
      )}

      {/* Parámetros considerados — globales (solo acero y geometría general) */}
      <details className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.bd}` }}>
        <summary className="px-3 py-2 text-xs font-semibold cursor-pointer select-none"
          style={{ background: C.sb, color: C.dm, listStyle: 'none' }}>
          Geometría y acero ▾
        </summary>
        <div className="p-3 space-y-3 text-[10px]" style={{ background: C.cd, color: C.dm }}>

          {/* Acero */}
          <div>
            <div className="font-semibold mb-1" style={{ color: C.ac }}>Acero</div>
            <div className="flex flex-wrap gap-x-5 gap-y-0.5">
              <span>Calidad: <b style={{ color: C.tx }}>F36</b></span>
              <span>Fy = <b style={{ color: C.tx }}>{Fy} MPa</b></span>
              <span>Fu = <b style={{ color: C.tx }}>{Fu} MPa</b></span>
              <span>E = <b style={{ color: C.tx }}>200,000 MPa</b></span>
            </div>
          </div>

          {/* Geometría y pandeo */}
          <div>
            <div className="font-semibold mb-1" style={{ color: C.ac }}>Geometría y longitudes de pandeo</div>
            <div className="flex flex-wrap gap-x-5 gap-y-0.5">
              <span>sep: <b style={{ color: C.tx }}>{parametros.sep.toFixed(2)} m</b></span>
              <span>θ: <b style={{ color: C.tx }}>{parametros.theta.toFixed(1)}°</b></span>
              <span>L columna: <b style={{ color: C.tx }}>{parametros.Lcolumna.toFixed(2)} m</b></span>
              <span>L rafter: <b style={{ color: C.tx }}>{parametros.Lrafter.toFixed(2)} m</b></span>
              <span>K col: <b style={{ color: C.tx }}>{parametros.Kcol.toFixed(2)}</b></span>
              <span>KLx col: <b style={{ color: C.tx }}>{parametros.KLx_col.toFixed(2)} m</b></span>
              <span>KLy col: <b style={{ color: C.tx }}>{parametros.KLy_col.toFixed(2)} m</b></span>
              <span>KLx raf: <b style={{ color: C.tx }}>{parametros.KLx_raf.toFixed(2)} m</b></span>
              <span>KLy raf: <b style={{ color: C.tx }}>{parametros.KLy_raf.toFixed(2)} m</b></span>
            </div>
          </div>

          {/* Peso propio */}
          {result.pesoPropio && (
            <div>
              <div className="font-semibold mb-1" style={{ color: C.ac }}>Peso propio del pórtico</div>
              <div className="flex flex-wrap gap-x-5 gap-y-0.5">
                <span>PP col: <b style={{ color: C.tx }}>{result.pesoPropio.columna.toFixed(1)} kg/m</b></span>
                <span>PP raf: <b style={{ color: C.tx }}>{result.pesoPropio.rafter.toFixed(1)} kg/m</b></span>
                <span>PP total/pórtico: <b style={{ color: C.tx }}>{result.pesoPropio.porPortico.toFixed(0)} kg</b></span>
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

// ── Tab Fundaciones ───────────────────────────────────────────────────────────

function TabFundaciones({ geo, fundInp, setFundInp, fundResult, result }) {
  const setF = useCallback((k, v) => setFundInp(p => ({ ...p, [k]: v })), [setFundInp]);

  // Cuando cambia el preset de suelo, auto-fill los parámetros
  const handleSuelo = (id) => {
    const s = SUELOS_ARG.find(s => s.id === id);
    if (!s || id === 'custom') { setF('sueloId', id); return; }
    setFundInp(p => ({
      ...p,
      sueloId: id,
      c: s.c, phi: s.phi, gamma: s.gamma,
      tauFric: s.tauFric, qTip: s.qTip,
    }));
  };

  const sueloActual = SUELOS_ARG.find(s => s.id === fundInp.sueloId) || SUELOS_ARG[0];
  const esCustom = fundInp.sueloId === 'custom';
  const esEmpotrada = geo.tipoBase === 'empotrada';
  const esPilotes = fundInp.tipoFund === 'pilotes';
  const b = fundResult?.base;

  return (
    <div className="p-4 max-w-2xl space-y-4">

      {/* ── Parámetros ── */}
      <div className="p-4 rounded-lg space-y-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <div className="text-sm font-bold" style={{ color: C.ac }}>Parámetros de fundación</div>

        {/* Tipo base */}
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: C.dm }}>Base:</span>
          <StatusBadge label={esEmpotrada ? 'EMPOTRADA' : 'ARTICULADA'} color={esEmpotrada ? C.pos : '#3b82f6'} />
          <span className="text-[10px]" style={{ color: C.dm }}>
            {esEmpotrada ? '→ genera momento en fundación' : '→ sin momento en fundación'}
          </span>
        </div>

        {/* Tipo fundación */}
        <SelInp label="Tipo de fundación" value={fundInp.tipoFund}
          onChange={v => setF('tipoFund', v)}
          options={[
            { value: 'superficial', label: 'Superficial (zapata corrida / aislada)' },
            { value: 'pilotes',     label: 'Pilotes perforados' },
          ]} />

        {/* Selector de suelo */}
        <div>
          <label className="block text-xs mb-1" style={{ color: C.dm }}>Tipo de suelo (preset)</label>
          <select value={fundInp.sueloId || 'limo_pampa_media'}
            onChange={e => handleSuelo(e.target.value)}
            className="w-full rounded px-2 py-1 text-xs"
            style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}>
            {SUELOS_ARG.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          {sueloActual.nota && (
            <div className="text-[10px] mt-1 px-1" style={{ color: C.dm }}>{sueloActual.nota}</div>
          )}
        </div>

        {/* Parámetros del suelo — editables */}
        <div className="grid grid-cols-3 gap-2">
          <NumInp label="c  [kPa]"     value={fundInp.c   ?? 25}  onChange={v => setF('c', v)}     min={0}  max={200} step={5}   />
          <NumInp label="φ  [°]"       value={fundInp.phi  ?? 18}  onChange={v => setF('phi', v)}   min={0}  max={45}  step={1}   />
          <NumInp label="γ  [kN/m³]"  value={fundInp.gamma ?? 17.5} onChange={v => setF('gamma', v)} min={14} max={25}  step={0.5} />
        </div>

        {/* Cota de fundación (siempre visible) */}
        <NumInp label="Cota de fundación Df" unit="m" value={fundInp.cotaFund ?? 1.5}
          onChange={v => setF('cotaFund', v)} min={0.5} max={5} step={0.1} />

        {/* Pilotes */}
        {esPilotes && (
          <div className="space-y-2 pt-1" style={{ borderTop: `1px solid ${C.bd}` }}>
            <div className="text-xs font-semibold" style={{ color: C.dm }}>Parámetros de pilotes</div>
            <div className="grid grid-cols-2 gap-2">
              <NumInp label="τ fricción [kN/m²]" value={fundInp.tauFric  ?? 28}  onChange={v => setF('tauFric', v)}  min={5}   max={200} step={5}   />
              <NumInp label="q punta [kN/m²]"    value={fundInp.qTip    ?? 300}  onChange={v => setF('qTip', v)}    min={50}  max={3000} step={50}  />
              <NumInp label="Diámetro D [m]"     value={fundInp.D_pilote ?? 0.40} onChange={v => setF('D_pilote', v)} min={0.20} max={1.20} step={0.05} />
              <NumInp label="Longitud L [m]"     value={fundInp.L_pilote ?? 8}   onChange={v => setF('L_pilote', v)} min={3}   max={30}  step={0.5} />
            </div>
          </div>
        )}
      </div>

      {/* ── Resultados ── */}
      {fundResult && b && (
        <div className="p-4 rounded-lg space-y-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold" style={{ color: C.ac }}>Resultado</div>
            <StatusBadge
              label={fundResult.pasa ? 'VERIFICA' : 'NO VERIFICA'}
              color={fundResult.pasa ? C.pos : C.neg} />
          </div>

          {fundResult.tipo === 'superficial' ? (
            <>
              {/* Capacidad portante */}
              <div className="text-xs font-semibold" style={{ color: C.dm }}>Capacidad portante (Terzaghi, FS=3)</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono" style={{ color: C.dm }}>
                <span>Nc={b.cap?.Nc?.toFixed(2) ?? '—'}</span><span>Nq={b.cap?.Nq?.toFixed(2) ?? '—'}</span>
                <span>q={b.cap?.q?.toFixed(1) ?? '—'} kPa</span><span>q_ult={b.cap?.qUlt?.toFixed(1) ?? '—'} kPa</span>
              </div>
              <ResultRow label="σ admisible"
                value={`${b.cap?.qAdm?.toFixed(1) ?? '—'} kN/m²`}
                ok={true} />
              <div className="pt-1" style={{ borderTop: `1px solid ${C.bd}` }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.dm }}>Dimensionado zapata (cuadrada)</div>
                <ResultRow label="Lado B = L" value={`${b.B?.toFixed(2) ?? '—'} m`} />
                <ResultRow label="Altura h"   value={`${b.alto?.toFixed(2) ?? '—'} m`} />
                <ResultRow label="Pedestal"   value={`${b.pedestal?.ancho?.toFixed(2) ?? '—'} × ${b.pedestal?.ancho?.toFixed(2) ?? '—'} × ${b.pedestal?.alto?.toFixed(2) ?? '—'} m`} />
                <ResultRow label="Vol. H° / base" value={b.volumen?.toFixed(2) ?? '—'} unit="m³" />
              </div>
              <div className="pt-1" style={{ borderTop: `1px solid ${C.bd}` }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.dm }}>Verificación de tensiones</div>
                <ResultRow label="σ max (con momento)"
                  value={`${b.sigma_max?.toFixed(1) ?? '—'} kN/m²`}
                  ok={b.pasa_tension}
                  warn={!b.pasa_tension} />
                <ResultRow label="σ min (despegue)"
                  value={`${b.sigma_min?.toFixed(1) ?? '—'} kN/m²`}
                  ok={b.kern_ok}
                  warn={!b.kern_ok} />
                {!b.kern_ok && (
                  <div className="text-[10px] px-1 mt-0.5" style={{ color: '#f59e0b' }}>
                    ⚠ Excentricidad e={b.e_exc?.toFixed(2)}m &gt; B/6={((b.B ?? 0) / 6).toFixed(2)}m → riesgo de despegue
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Capacidad pilote */}
              <div className="text-xs font-semibold" style={{ color: C.dm }}>Capacidad por pilote (FS=2.5)</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono" style={{ color: C.dm }}>
                <span>Q_fricción = {b.Qs?.toFixed(1) ?? '—'} kN</span>
                <span>Q_punta   = {b.Qp?.toFixed(1) ?? '—'} kN</span>
                <span>Q_ult     = {b.Qpilote_ult?.toFixed(1) ?? '—'} kN</span>
                <span style={{ color: C.ac }}>Q_adm     = {b.Qpilote_adm?.toFixed(1) ?? '—'} kN</span>
              </div>
              <div className="pt-1" style={{ borderTop: `1px solid ${C.bd}` }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.dm }}>Grupo de pilotes</div>
                <ResultRow label="N° pilotes / base"  value={`${b.nPilotes ?? '—'}`} />
                <ResultRow label="Separación pilotes" value={`${b.sep_pilotes?.toFixed(2) ?? '—'} m (≥ 3D)`} />
                <ResultRow label="Q max pilote (con M)"
                  value={`${b.Q_max_pilote?.toFixed(1) ?? '—'} kN`}
                  ok={b.pasa} warn={!b.pasa} />
                <ResultRow label="Dado cabecera"
                  value={`${b.anchoDado?.toFixed(2) ?? '—'} × ${b.anchoDado?.toFixed(2) ?? '—'} × ${b.altoDado?.toFixed(2) ?? '—'} m`} />
                <ResultRow label="Vol. dado / base" value={b.volDado?.toFixed(2) ?? '—'} unit="m³" />
              </div>
            </>
          )}

          {/* Totales */}
          <div className="pt-2" style={{ borderTop: `1px solid ${C.bd}` }}>
            <div className="text-xs font-semibold mb-1" style={{ color: C.dm }}>Resumen nave completa</div>
            <ResultRow label="Cantidad de bases" value={fundResult.nBases} />
            {fundResult.tipo === 'pilotes' && (
              <ResultRow label="Pilotes totales" value={fundResult.nPilotesTotal} />
            )}
            <ResultRow label="Hormigón total" value={`${fundResult.volTotalHormigon?.toFixed(1) ?? '—'} m³`} />
          </div>

          <div className="text-[10px] mt-2" style={{ color: `${C.dm}80` }}>
            Predimensionado orientativo. Verificar con estudio geotécnico (CIRSOC 601).
          </div>
        </div>
      )}
    </div>
  );
}
