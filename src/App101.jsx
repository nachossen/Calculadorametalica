/**
 * App101.jsx — Módulo CIRSOC 101-2025 (Cargas y Combinaciones de Carga)
 */

import { useState, useMemo } from 'react';
import { Weight, Layers, Building2, Snowflake, CloudRain, Wind, Activity, Calculator } from 'lucide-react';
import { C } from './ui/common/theme.js';
import { MATERIALES } from './cirsoc101/data/materiales.js';
import { calcDeadLoad } from './cirsoc101/core/deadLoad.js';
import { calcRoofLiveLoad } from './cirsoc101/core/roofLiveLoad.js';
import { calcCombinations } from './cirsoc101/core/combinations.js';
import { calcRainLoad, calcRainLoadDetailed } from './cirsoc101/core/rainLoad.js';
import { DRAINAGE_TABLE } from './cirsoc101/data/drainageTable.js';
import { FloorPlanEditor } from './cirsoc101/ui/FloorPlanEditor.jsx';
import { TIPOS_CUBIERTA } from './cirsoc101/data/cubiertas.js';

const TABS = [
  { id: 'D', label: 'Carga Muerta (D)', icon: Weight },
  { id: 'L', label: 'Sobrecarga (L)', icon: Layers },
  { id: 'Lr', label: 'Sob. Techo (Lr)', icon: Building2 },
  { id: 'R', label: 'Lluvia (R)', icon: CloudRain },
  { id: 'comb', label: 'Combinaciones', icon: Calculator },
];

function SectionCard({ title, children }) {
  return (
    <div className="rounded-lg p-4" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
      <div className="text-sm font-bold mb-3" style={{ color: C.tx }}>{title}</div>
      {children}
    </div>
  );
}

function ResultBadge({ label, value, unit, color }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs" style={{ color: C.dm }}>{label}:</span>
      <span className="font-mono font-bold text-sm" style={{ color: color || C.ac }}>{value}</span>
      {unit && <span className="text-xs" style={{ color: C.dm }}>{unit}</span>}
    </div>
  );
}

/** Panel de Carga Muerta */
function TabD({ layers, setLayers }) {
  const result = useMemo(() => calcDeadLoad(layers), [layers]);

  const addLayer = () => setLayers(l => [...l, { materialId: 'hormigon_armado', espesor: 0.15 }]);
  const removeLayer = i => setLayers(l => l.filter((_, j) => j !== i));
  const updateLayer = (i, k, v) => setLayers(l => l.map((ly, j) => j === i ? { ...ly, [k]: v } : ly));

  return (
    <div className="space-y-4">
      <SectionCard title="Capas del Elemento">
        <div className="space-y-2">
          {layers.map((ly, i) => {
            const mat = MATERIALES.find(m => m.id === ly.materialId);
            const isSheet = mat && mat.porM2 != null;
            const isChapa = mat?.id === 'chapa_galvanizada';
            const needsEspesor = !isSheet || isChapa;
            return (
              <div key={i} className="flex gap-2 items-center flex-wrap">
                <select value={ly.materialId} onChange={e => updateLayer(i, 'materialId', e.target.value)}
                  className="rounded px-2 py-1 text-xs flex-1 min-w-[140px]" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}>
                  {MATERIALES.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                {needsEspesor && <div className="flex items-center gap-1">
                  <input type="number" value={ly.espesor} onChange={e => updateLayer(i, 'espesor', Number(e.target.value))}
                    step={isChapa ? 0.1 : 0.01} min={0.001}
                    className="w-20 rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
                  <span className="text-xs" style={{ color: C.dm }}>{isChapa ? 'mm' : 'm'}</span>
                </div>}
                <button onClick={() => removeLayer(i)} className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#ef4444', border: '1px solid #ef4444' }}>×</button>
              </div>
            );
          })}
        </div>
        <button onClick={addLayer} className="mt-2 text-xs px-3 py-1 rounded" style={{ background: C.bg, color: C.ac, border: `1px solid ${C.bd}` }}>+ Agregar capa</button>
      </SectionCard>

      <SectionCard title="Resultado — Carga Muerta (D)">
        <ResultBadge label="D total" value={result.totalPorM2.toFixed(3)} unit="kN/m²" />
        <div className="mt-2 space-y-1">
          {result.detalle.map((d, i) => (
            <div key={i} className="flex justify-between text-xs" style={{ color: C.dm }}>
              <span>{d.nombre}</span>
              <span className="font-mono" style={{ color: C.tx }}>{d.cargaPorM2.toFixed(3)} kN/m²</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/** Panel de Sobrecarga de Techo */
function TabLr({ lrInp, setLrInp }) {
  const setLr = (k, v) => setLrInp(p => ({ ...p, [k]: v }));
  const manual = !!lrInp.manualAtTheta;

  // Frame geometry → auto At and θ
  const geoB = lrInp.geoB || 12;
  const geoL = lrInp.geoL || 30;
  const geoHe = lrInp.geoHe || 5;
  const geoHc = lrInp.geoHc || 7;
  const geoPorT = lrInp.geoPorT || 6;

  const autoTheta = Math.atan2(geoHc - geoHe, geoB / 2) * 180 / Math.PI;
  const autoThetaRad = autoTheta * Math.PI / 180;
  const sep = geoL / Math.max(geoPorT - 1, 1);
  const slopeLen = (geoB / 2) / Math.cos(autoThetaRad);
  const autoAt = sep * slopeLen;

  const effectiveAt = manual ? (lrInp.at || 20) : autoAt;
  const effectiveTheta = manual ? (lrInp.theta || 15) : autoTheta;

  const tipoCub = TIPOS_CUBIERTA.find(t => t.id === (lrInp.tipoCubierta || 'chapa_galv')) || TIPOS_CUBIERTA[0];
  const pesoCubierta = lrInp.tipoCubierta === 'custom' ? (lrInp.pesoCubCustom || 0) : tipoCub.peso;
  const pesoCorrea = (lrInp.pesoCorrea || 0.05) / Math.max(lrInp.sepCorreas || 1.5, 0.1);
  const pesoEstructura = lrInp.pesoEstructura || 0;
  const cargaInstal = lrInp.cargaInstal || 0;
  const pesoTotal = pesoCubierta + pesoCorrea + pesoEstructura + cargaInstal;
  const esLiviana = pesoTotal <= 0.5;

  const result = useMemo(() =>
    calcRoofLiveLoad({ At: effectiveAt, theta: effectiveTheta, pesoTotal }),
    [effectiveAt, effectiveTheta, pesoTotal]
  );

  // Lr lineal para pórtico típico
  const lrLineal = result.Lr * sep;

  return (
    <div className="space-y-4">
      {/* Frame geometry section */}
      <SectionCard title="Geometría del Pórtico">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setLr('manualAtTheta', false)}
            className="px-3 py-1 rounded text-xs font-bold"
            style={{ background: !manual ? C.ac : C.bg, color: !manual ? '#000' : C.dm, border: `1px solid ${!manual ? C.ac : C.bd}` }}>
            Desde geometría
          </button>
          <button onClick={() => setLr('manualAtTheta', true)}
            className="px-3 py-1 rounded text-xs font-bold"
            style={{ background: manual ? C.ac : C.bg, color: manual ? '#000' : C.dm, border: `1px solid ${manual ? C.ac : C.bd}` }}>
            Manual
          </button>
        </div>

        {!manual ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: C.dm }}>B (ancho) [m]</label>
                <input type="number" value={geoB} onChange={e => setLr('geoB', Math.max(1, Number(e.target.value)))}
                  min={1} step={0.5} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: C.dm }}>L (largo) [m]</label>
                <input type="number" value={geoL} onChange={e => setLr('geoL', Math.max(1, Number(e.target.value)))}
                  min={1} step={0.5} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: C.dm }}>he (alero) [m]</label>
                <input type="number" value={geoHe} onChange={e => setLr('geoHe', Math.max(1, Number(e.target.value)))}
                  min={1} step={0.5} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: C.dm }}>hc (cumbrera) [m]</label>
                <input type="number" value={geoHc} onChange={e => setLr('geoHc', Math.max(1, Number(e.target.value)))}
                  min={1} step={0.5} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: C.dm }}>Pórticos</label>
                <input type="number" value={geoPorT} onChange={e => setLr('geoPorT', Math.max(2, Number(e.target.value)))}
                  min={2} step={1} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
              </div>
            </div>
            <div className="mt-2 text-xs font-mono space-y-0.5" style={{ color: C.dm }}>
              <div>θ = atan(({geoHc}-{geoHe})/({geoB}/2)) = <strong style={{ color: C.ac }}>{autoTheta.toFixed(2)}°</strong></div>
              <div>Sep = {geoL}/({geoPorT}-1) = <strong style={{ color: C.ac }}>{sep.toFixed(2)} m</strong></div>
              <div>L_faldón = ({geoB}/2)/cos({autoTheta.toFixed(1)}°) = <strong style={{ color: C.ac }}>{slopeLen.toFixed(2)} m</strong></div>
              <div>At = sep × L_faldón = {sep.toFixed(2)} × {slopeLen.toFixed(2)} = <strong style={{ color: C.ac }}>{autoAt.toFixed(2)} m²</strong></div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: C.dm }}>Área Tributaria [m²]</label>
              <input type="number" value={lrInp.at || 20} onChange={e => setLr('at', Math.max(1, Number(e.target.value)))}
                min={1} step={1} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: C.dm }}>Pendiente θ [°]</label>
              <input type="number" value={lrInp.theta || 15} onChange={e => setLr('theta', Math.max(0, Number(e.target.value)))}
                min={0} max={90} step={1} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Clasificación de Cubierta — Art. 4.8.1 CIRSOC 101-2025">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dm }}>Tipo de cubierta</label>
            <select value={lrInp.tipoCubierta || 'chapa_galv'} onChange={e => setLr('tipoCubierta', e.target.value)}
              className="w-full rounded px-2 py-1 text-xs" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}>
              {TIPOS_CUBIERTA.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.peso ? ` (${t.peso} kN/m²)` : ''}</option>)}
            </select>
          </div>
          {lrInp.tipoCubierta === 'custom' && (
            <div>
              <label className="block text-xs mb-1" style={{ color: C.dm }}>Peso cubierta [kN/m²]</label>
              <input type="number" value={lrInp.pesoCubCustom || 0} onChange={e => setLr('pesoCubCustom', Number(e.target.value))}
                min={0} step={0.01} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
            </div>
          )}
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dm }}>Sep. correas [m]</label>
            <input type="number" value={lrInp.sepCorreas || 1.5} onChange={e => setLr('sepCorreas', Math.max(0.1, Number(e.target.value)))}
              min={0.1} step={0.1} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dm }}>Peso correa [kN/m]</label>
            <input type="number" value={lrInp.pesoCorrea || 0.05} onChange={e => setLr('pesoCorrea', Number(e.target.value))}
              min={0} step={0.01} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dm }}>Peso est. soporte [kN/m²]</label>
            <input type="number" value={lrInp.pesoEstructura || 0} onChange={e => setLr('pesoEstructura', Math.max(0, Number(e.target.value)))}
              min={0} step={0.01} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
            <div className="mt-0.5 text-xs" style={{ color: C.dm }}>Pórtico, vigas, cabriadas (Art. 4.8.1)</div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dm }}>Carga instal. [kN/m²]</label>
            <input type="number" value={lrInp.cargaInstal || 0} onChange={e => setLr('cargaInstal', Number(e.target.value))}
              min={0} step={0.01} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
          </div>
        </div>

        {/* Weight breakdown */}
        <div className="mt-3 text-xs font-mono space-y-0.5" style={{ color: C.tx }}>
          <div>Cerramiento: {pesoCubierta.toFixed(3)} kN/m²</div>
          <div>Correas: {(lrInp.pesoCorrea || 0.05).toFixed(2)} kN/m ÷ {(lrInp.sepCorreas || 1.5).toFixed(1)} m = {pesoCorrea.toFixed(3)} kN/m²</div>
          {pesoEstructura > 0 && <div>Estructura soporte: {pesoEstructura.toFixed(3)} kN/m²</div>}
          {cargaInstal > 0 && <div>Instalaciones: {cargaInstal.toFixed(3)} kN/m²</div>}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs" style={{ color: C.dm }}>Peso total cubierta:</span>
          <span className="font-mono font-bold text-sm" style={{ color: C.ac }}>{pesoTotal.toFixed(3)} kN/m²</span>
          <span className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: esLiviana ? 'rgba(56,189,248,0.15)' : 'rgba(234,179,8,0.15)', color: esLiviana ? '#38bdf8' : '#eab308', border: `1px solid ${esLiviana ? '#38bdf8' : '#eab308'}` }}>
            {esLiviana ? 'LIVIANA (≤ 0.5)' : 'PESADA (> 0.5)'}
          </span>
        </div>
      </SectionCard>

      <SectionCard title="Resultado — Sobrecarga de Cubierta (Lr)">
        <div className="flex flex-wrap gap-4">
          <ResultBadge label="R₁" value={result.R1.toFixed(3)} />
          <ResultBadge label="R₂" value={result.R2.toFixed(3)} />
          <ResultBadge label="Lr" value={result.Lr.toFixed(3)} unit="kN/m²" />
          {!manual && <ResultBadge label="Lr lineal" value={lrLineal.toFixed(3)} unit="kN/m" color="#eab308" />}
        </div>
        <div className="mt-2 text-xs font-mono" style={{ color: C.dm }}>
          {esLiviana ? (
            <>Lr = 0.45 × R₁ × R₂ = 0.45 × {result.R1.toFixed(3)} × {result.R2.toFixed(3)} = {(0.45 * result.R1 * result.R2).toFixed(3)} → {result.Lr.toFixed(3)} kN/m²</>
          ) : (
            <>Lr = 0.96 × R₁ × R₂ = 0.96 × {result.R1.toFixed(3)} × {result.R2.toFixed(3)} = {(0.96 * result.R1 * result.R2).toFixed(3)} → {result.Lr.toFixed(3)} kN/m²</>
          )}
          {!manual && (
            <div className="mt-0.5">Lr_lineal = {result.Lr.toFixed(3)} × {sep.toFixed(2)} = <strong style={{ color: '#eab308' }}>{lrLineal.toFixed(3)} kN/m</strong> (carga por metro de pórtico)</div>
          )}
        </div>
        <div className="mt-1 text-xs" style={{ color: C.dm }}>
          {esLiviana
            ? `0.203 ≤ Lr ≤ 0.765 kN/m² (Art. 4.8.1.b — Livianas, p=${result.pendientePct}%)`
            : `0.58 ≤ Lr ≤ 0.96 kN/m² (Art. 4.8.1.a — Pesadas, F=${result.F})`
          }
        </div>
      </SectionCard>

      {/* Clarifying note */}
      <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(56,189,248,0.06)', border: `1px solid rgba(56,189,248,0.3)`, color: C.dm }}>
        <div className="font-bold mb-1" style={{ color: C.ac }}>Nota — Clasificación de Cubierta Liviana</div>
        La clasificación de "cubierta liviana" depende exclusivamente del peso del paquete de cubierta (chapa, aislación, correas).
        El peso propio del pórtico principal <strong style={{ color: C.tx }}>no impacta</strong> en esta definición.
      </div>
    </div>
  );
}

/** SVG schematic for rain load */
function RainSchemaSVG() {
  const w = 440, h = 200;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 220, borderRadius: 6 }}>
      {/* Roof cross section */}
      <rect x={20} y={40} width={400} height={12} fill="#475569" rx={2} />
      {/* Slight slope indicator */}
      <line x1={20} y1={40} x2={420} y2={44} stroke="#64748b" strokeWidth={1} strokeDasharray="4 2" />
      {/* Water level (ds) */}
      <rect x={20} y={52} width={400} height={50} fill="rgba(56,189,248,0.15)" stroke="rgba(56,189,248,0.4)" strokeWidth={1} />
      <text x={230} y={82} textAnchor="middle" fill="#38bdf8" fontSize={11} fontFamily="monospace" fontWeight="bold">Agua estancada</text>
      {/* ds dimension */}
      <line x1={435} y1={52} x2={435} y2={102} stroke="#38bdf8" strokeWidth={1} />
      <line x1={430} y1={52} x2={440} y2={52} stroke="#38bdf8" strokeWidth={1} />
      <line x1={430} y1={102} x2={440} y2={102} stroke="#38bdf8" strokeWidth={1} />
      <text x={440} y={80} fill="#38bdf8" fontSize={10} fontFamily="monospace" fontWeight="bold" dominantBaseline="middle">ds</text>
      {/* Additional hydraulic head (dh) */}
      <rect x={20} y={102} width={400} height={30} fill="rgba(234,179,8,0.1)" stroke="rgba(234,179,8,0.3)" strokeWidth={1} strokeDasharray="4 2" />
      <text x={230} y={120} textAnchor="middle" fill="#eab308" fontSize={10} fontFamily="monospace">Carga hidráulica dh</text>
      {/* dh dimension */}
      <line x1={435} y1={102} x2={435} y2={132} stroke="#eab308" strokeWidth={1} />
      <line x1={430} y1={102} x2={440} y2={102} stroke="#eab308" strokeWidth={1} />
      <line x1={430} y1={132} x2={440} y2={132} stroke="#eab308" strokeWidth={1} />
      <text x={440} y={119} fill="#eab308" fontSize={10} fontFamily="monospace" fontWeight="bold" dominantBaseline="middle">dh</text>
      {/* Primary drain (circular pipe) */}
      <circle cx={80} cy={102} r={10} fill="none" stroke="#22c55e" strokeWidth={2} />
      <line x1={80} y1={112} x2={80} y2={155} stroke="#22c55e" strokeWidth={2} />
      <text x={80} y={168} textAnchor="middle" fill="#22c55e" fontSize={9} fontFamily="monospace">Desagüe primario</text>
      <text x={80} y={180} textAnchor="middle" fill="#22c55e" fontSize={8} fontFamily="monospace">(bajada Ø)</text>
      {/* Flow arrows to primary drain */}
      <line x1={150} y1={75} x2={100} y2={90} stroke="rgba(56,189,248,0.6)" strokeWidth={1} markerEnd="url(#arrowR)" />
      <line x1={200} y1={70} x2={115} y2={88} stroke="rgba(56,189,248,0.6)" strokeWidth={1} markerEnd="url(#arrowR)" />
      {/* Secondary drain (scupper/gárgola) */}
      <rect x={380} y={52} width={40} height={25} fill="none" stroke="#f97316" strokeWidth={2} rx={2} />
      <line x1={400} y1={77} x2={400} y2={100} stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 2" />
      <text x={400} y={145} textAnchor="middle" fill="#f97316" fontSize={9} fontFamily="monospace">Desagüe</text>
      <text x={400} y={157} textAnchor="middle" fill="#f97316" fontSize={9} fontFamily="monospace">secundario</text>
      <text x={400} y={169} textAnchor="middle" fill="#f97316" fontSize={8} fontFamily="monospace">(gárgola/scupper)</text>
      {/* Arrow marker */}
      <defs>
        <marker id="arrowR" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="rgba(56,189,248,0.6)" />
        </marker>
      </defs>
      {/* Labels */}
      <text x={20} y={30} fill="#94a3b8" fontSize={10} fontFamily="monospace">Corte transversal — Cubierta plana/baja pendiente</text>
    </svg>
  );
}

/** Panel de Carga de Lluvia */
function TabR({ rainInp, setRainInp }) {
  const setR = (k, v) => setRainInp(p => ({ ...p, [k]: v }));
  const detailed = rainInp.detailed || false;

  const resultDirect = useMemo(() => calcRainLoad(rainInp.ds, rainInp.dh), [rainInp.ds, rainInp.dh]);
  const resultDetailed = useMemo(() => detailed ? calcRainLoadDetailed({
    ds: rainInp.ds, area: rainInp.area || 200, intensidad: rainInp.intensidad || 100,
    drainType: rainInp.drainType || 'circ_152', pendiente: rainInp.pendiente || 0,
  }) : null, [detailed, rainInp.ds, rainInp.area, rainInp.intensidad, rainInp.drainType, rainInp.pendiente]);

  const result = detailed && resultDetailed ? resultDetailed : resultDirect;

  return (
    <div className="space-y-4">
      {/* SVG Schematic */}
      <SectionCard title="Esquema — Acumulación de Agua en Cubierta">
        <RainSchemaSVG />
      </SectionCard>

      <SectionCard title="Carga de Lluvia — Cap. 5 CIRSOC 101-2025">
        <div className="text-xs mb-3" style={{ color: C.dm }}>
          R = 0.0098 × (d<sub>s</sub> + d<sub>h</sub>) &nbsp;[kN/m²]
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-3">
          {['Ingreso directo', 'Modo detallado'].map((label, i) => (
            <button key={i} onClick={() => setR('detailed', i === 1)}
              className="px-3 py-1 rounded text-xs font-bold transition-colors"
              style={{
                background: (detailed ? i === 1 : i === 0) ? C.ac : C.bg,
                color: (detailed ? i === 1 : i === 0) ? '#fff' : C.dm,
                border: `1px solid ${(detailed ? i === 1 : i === 0) ? C.ac : C.bd}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ds is always needed */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dm }}>
              d<sub>s</sub> — Profundidad de agua estancada [mm]
            </label>
            <input type="number" value={rainInp.ds} onChange={e => setR('ds', Math.max(0, Number(e.target.value)))}
              min={0} step={1} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
          </div>

          {!detailed && (
            <div>
              <label className="block text-xs mb-1" style={{ color: C.dm }}>
                d<sub>h</sub> — Carga hidráulica adicional [mm]
              </label>
              <input type="number" value={rainInp.dh} onChange={e => setR('dh', Math.max(0, Number(e.target.value)))}
                min={0} step={1} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
            </div>
          )}
        </div>

        {/* Detailed mode fields */}
        {detailed && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: C.dm }}>Área cubierta atendida [m²]</label>
              <input type="number" value={rainInp.area || 200} onChange={e => setR('area', Math.max(1, Number(e.target.value)))}
                min={1} step={10} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: C.dm }}>Intensidad lluvia [mm/h]</label>
              <input type="number" value={rainInp.intensidad || 100} onChange={e => setR('intensidad', Math.max(1, Number(e.target.value)))}
                min={1} step={10} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
              <div className="mt-0.5 text-xs" style={{ color: C.dm }}>SMN, TR=100 años, dur. 1 hora</div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: C.dm }}>Tipo de desagüe</label>
              <select value={rainInp.drainType || 'circ_152'} onChange={e => setR('drainType', e.target.value)}
                className="w-full rounded px-2 py-1 text-xs" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}>
                {Object.entries(DRAINAGE_TABLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: C.dm }}>Pendiente cubierta [%]</label>
              <input type="number" value={rainInp.pendiente || 0} onChange={e => setR('pendiente', Math.max(0, Number(e.target.value)))}
                min={0} step={0.5} className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Ponding warning */}
      {detailed && resultDetailed?.ponding && (
        <div className="rounded p-3 text-xs" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid #eab308', color: '#eab308' }}>
          <strong>Advertencia (Art. 5.4):</strong> Pendiente {'<'} 3% — cubierta susceptible a inestabilidad por acumulación de agua (ponding).
          Verificar rigidez del sistema estructural.
        </div>
      )}

      <SectionCard title="Resultado — Carga de Lluvia (R)">
        <div className="flex flex-wrap gap-4">
          <ResultBadge label="ds" value={result.ds.toFixed(0)} unit="mm" />
          <ResultBadge label="dh" value={result.dh.toFixed(0)} unit="mm" />
          {detailed && resultDetailed && <ResultBadge label="Q" value={resultDetailed.Q.toFixed(2)} unit="L/s" />}
          <ResultBadge label="R" value={result.R.toFixed(3)} unit="kN/m²" />
        </div>
        <div className="mt-2 text-xs font-mono" style={{ color: C.dm }}>
          {detailed && resultDetailed && (
            <div className="mb-1">Q = 0.000278 × {rainInp.area || 200} × {rainInp.intensidad || 100} = {resultDetailed.Q.toFixed(3)} L/s → d<sub>h</sub> = {resultDetailed.dh.toFixed(1)} mm (Tabla C 5.1)</div>
          )}
          R = 0.0098 × ({result.ds.toFixed(0)} + {result.dh.toFixed(0)}) = 0.0098 × {(result.ds + result.dh).toFixed(0)} = {result.R.toFixed(3)} kN/m²
        </div>
      </SectionCard>

      {/* Methodology */}
      <details className="rounded-lg" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <summary className="px-3 py-2 text-xs font-bold cursor-pointer" style={{ color: C.tx }}>
          Metodología de Cálculo — Art. 5 CIRSOC 101-2025
        </summary>
        <div className="px-3 pb-3 text-xs space-y-2" style={{ color: C.dm }}>
          <div className="font-bold" style={{ color: C.tx }}>Paso 1 — Determinar d<sub>s</sub></div>
          <div>d<sub>s</sub> es la profundidad de agua estancada en la cubierta hasta el borde inferior del desagüe primario. Depende de la geometría de la cubierta y la ubicación del desagüe.</div>

          <div className="font-bold" style={{ color: C.tx }}>Paso 2 — Calcular caudal Q</div>
          <div>Q = 0.000278 × A × i &nbsp;[L/s]</div>
          <div>Donde A = área de cubierta atendida por el desagüe [m²], i = intensidad de lluvia [mm/h] (SMN, TR=100 años, duración 1 hora).</div>

          <div className="font-bold" style={{ color: C.tx }}>Paso 3 — Obtener d<sub>h</sub></div>
          <div>d<sub>h</sub> es la carga hidráulica adicional sobre el desagüe, obtenida de la Tabla C 5.1 según el tipo y diámetro del desagüe y el caudal Q calculado.</div>
          <div style={{ color: C.tx }}>
            <strong>Desagüe primario</strong> (bajada circular/rectangular): reduce d<sub>s</sub> al evacuar agua. Su capacidad determina d<sub>h</sub>.<br />
            <strong>Desagüe secundario</strong> (gárgola/scupper): actúa como aliviadero de emergencia. Limita el d<sub>h</sub> máximo cuando el primario se obstruye o se ve superado.
          </div>

          <div className="font-bold" style={{ color: C.tx }}>Paso 4 — Calcular R</div>
          <div>R = 0.0098 × (d<sub>s</sub> + d<sub>h</sub>) &nbsp;[kN/m²]</div>
          <div>donde d<sub>s</sub> y d<sub>h</sub> en milímetros. Factor 0.0098 = γ_agua × 10⁻³ × 10⁻³ = 9.8 kN/m³ × 10⁻⁶ m/mm × 10³ mm/m.</div>

          <div className="font-bold" style={{ color: C.tx }}>Paso 5 — Verificar susceptibilidad a ponding</div>
          <div>Si la pendiente es menor al 3% (≈1.7°), la cubierta es susceptible a inestabilidad por acumulación progresiva de agua (ponding). En este caso, verificar la rigidez del sistema estructural según Art. 5.4.</div>
        </div>
      </details>
    </div>
  );
}

/** Panel de Combinaciones */
function TabComb({ loads, method, setMethod }) {
  const result = useMemo(() => calcCombinations(loads, method), [loads, method]);

  return (
    <div className="space-y-4">
      <SectionCard title="Cargas Aplicadas">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
          {Object.entries(loads).map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-1">
              <span style={{ color: C.dm }}>{k}:</span>
              <span className="font-mono font-bold" style={{ color: v > 0 ? C.ac : C.dm }}>{v.toFixed(3)}</span>
              <span style={{ color: C.dm }}>kN/m²</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex gap-2">
        <button onClick={() => setMethod('LRFD')} className="px-3 py-1 rounded text-xs font-bold"
          style={{ background: method === 'LRFD' ? C.ac : C.bg, color: method === 'LRFD' ? '#000' : C.dm, border: `1px solid ${C.bd}` }}>LRFD</button>
        <button onClick={() => setMethod('ASD')} className="px-3 py-1 rounded text-xs font-bold"
          style={{ background: method === 'ASD' ? C.ac : C.bg, color: method === 'ASD' ? '#000' : C.dm, border: `1px solid ${C.bd}` }}>ASD</button>
      </div>

      <SectionCard title={`Combinaciones ${method}`}>
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: C.bg }}>
                <th className="px-2 py-1 text-left text-xs" style={{ color: C.dm }}>#</th>
                <th className="px-2 py-1 text-left text-xs" style={{ color: C.dm }}>Combinación</th>
                <th className="px-2 py-1 text-right text-xs" style={{ color: C.dm }}>Resultado [kN/m²]</th>
              </tr>
            </thead>
            <tbody>
              {result.combos.map(c => (
                <tr key={c.id} style={{
                  borderBottom: `1px solid ${C.bd}`,
                  background: c.id === result.governing.id ? 'rgba(56,189,248,0.12)' : 'transparent',
                }}>
                  <td className="px-2 py-1 text-xs font-mono" style={{ color: C.dm }}>{c.id}</td>
                  <td className="px-2 py-1 text-xs" style={{ color: c.id === result.governing.id ? C.ac : C.tx }}>{c.label}</td>
                  <td className="px-2 py-1 text-xs text-right font-mono font-bold" style={{ color: c.id === result.governing.id ? C.ac : C.tx }}>{c.value.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs" style={{ color: C.ac }}>
          Gobernante: #{result.governing.id} — {result.governing.label} = {result.governing.value.toFixed(3)} kN/m²
        </div>
      </SectionCard>
    </div>
  );
}

export default function App101() {
  const [tab, setTab] = useState('D');

  // Dead load state
  const [layers, setLayers] = useState([
    { materialId: 'hormigon_armado', espesor: 0.15 },
    { materialId: 'membrana_asfaltica', espesor: 1 },
    { materialId: 'cielorraso_suspendido', espesor: 1 },
  ]);

  // Live load state
  const [liveInp, setLiveInp] = useState({ usoId: 'residencial', pisos: 1 });
  const [governingL, setGoverningL] = useState(null);

  // Roof live load state
  const [lrInp, setLrInp] = useState({ at: 20, theta: 15 });

  // Rain load state
  const [rainInp, setRainInp] = useState({ ds: 50, dh: 25 });

  // Combination method
  const [combMethod, setCombMethod] = useState('LRFD');

  // Calculate loads for combinations
  const deadResult = useMemo(() => calcDeadLoad(layers), [layers]);
  const lrPesoTotal = useMemo(() => {
    const tc = TIPOS_CUBIERTA.find(t => t.id === (lrInp.tipoCubierta || 'chapa_galv')) || TIPOS_CUBIERTA[0];
    const pc = lrInp.tipoCubierta === 'custom' ? (lrInp.pesoCubCustom || 0) : tc.peso;
    const pcorr = (lrInp.pesoCorrea || 0.05) / Math.max(lrInp.sepCorreas || 1.5, 0.1);
    return pc + pcorr + (lrInp.pesoEstructura || 0) + (lrInp.cargaInstal || 0);
  }, [lrInp]);
  const lrResult = useMemo(() => calcRoofLiveLoad({ At: lrInp.at, theta: lrInp.theta, pesoTotal: lrPesoTotal }), [lrInp.at, lrInp.theta, lrPesoTotal]);
  const rainResult = useMemo(() => {
    if (rainInp.detailed) {
      return calcRainLoadDetailed({
        ds: rainInp.ds, area: rainInp.area || 200, intensidad: rainInp.intensidad || 100,
        drainType: rainInp.drainType || 'circ_152', pendiente: rainInp.pendiente || 0,
      });
    }
    return calcRainLoad(rainInp.ds, rainInp.dh);
  }, [rainInp]);

  const loads = {
    D: deadResult.totalPorM2,
    L: governingL ?? 0,
    Lr: lrResult.Lr,
    S: 0,
    R: rainResult.R,
    W: 0,
    E: 0,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub tabs */}
      <div className="flex border-b shrink-0 overflow-x-auto" style={{ borderColor: C.bd, background: C.bg }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={['flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors',
              tab === id ? 'border-sky-500 bg-gray-800/50' : 'border-transparent hover:bg-gray-800/30',
            ].join(' ')}
            style={{ color: tab === id ? C.ac : C.dm }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl">
        {tab === 'D' && <TabD layers={layers} setLayers={setLayers} />}
        {tab === 'L' && <FloorPlanEditor liveInp={liveInp} setLiveInp={setLiveInp} onGoverningL={setGoverningL} />}
        {tab === 'Lr' && <TabLr lrInp={lrInp} setLrInp={setLrInp} />}
        {tab === 'R' && <TabR rainInp={rainInp} setRainInp={setRainInp} />}
        {tab === 'comb' && <TabComb loads={loads} method={combMethod} setMethod={setCombMethod} />}
      </div>
    </div>
  );
}
