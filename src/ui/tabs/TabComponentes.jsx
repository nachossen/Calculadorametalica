/**
 * ui/tabs/TabComponentes.jsx — Panel de Componentes y Revestimientos (C&R)
 * Flujo: Superficie → Elemento → Dimensiones → Auto At → Presiones
 */

import { useState, useMemo } from 'react';
import { Badge } from '../common/Badge.jsx';
import { C } from '../common/theme.js';
import { CirsocImg } from '../common/CirsocImg.jsx';
import { WallZoneDiagram, RoofZoneDiagram, WallZone3D } from '../views/ZoneDiagram.jsx';
import { CR_WALL_ZONE_DESC } from '../../data/crWalls.js';
import { CR_ROOF_ZONE_DESC } from '../../data/crRoofs.js';

/* ── Sub-elementos y cálculo automático de At ── */
const ELEM_TYPES = {
  paredes: [
    { id: 'panel_pared', label: 'Chapa / Panel', desc: 'At = ancho_ef × L_tramo' },
    { id: 'correa_pared', label: 'Correa de pared', desc: 'At = sep × L_tramo' },
    { id: 'tornillo_pared', label: 'Tornillo / Fijación', desc: 'At = sep × sep_fij' },
  ],
  techos: [
    { id: 'chapa_techo', label: 'Chapa / Panel', desc: 'At = ancho_ef × L_tramo' },
    { id: 'correa_techo', label: 'Correa de techo', desc: 'At = sep × L_tramo' },
    { id: 'tornillo_techo', label: 'Tornillo / Fijación', desc: 'At = sep × sep_fij' },
  ],
};

function calcAutoAt(subType, sep, Ltramo, sepFij) {
  if (subType.includes('tornillo')) {
    // Tornillo: At = sep_correas × sep_fijaciones
    return sep * sepFij;
  }
  if (subType.includes('correa')) {
    // Correa: At = sep_correas × L_tramo
    return sep * Ltramo;
  }
  // Chapa/Panel: At = ancho_ef × L_tramo, ancho_ef = max(sep, L/3)
  const anchoEf = Math.max(sep, Ltramo / 3);
  return anchoEf * Ltramo;
}

/* ── Input row ── */
const inp2 = { background: C.cd, color: C.tx, border: `1px solid ${C.bd}` };
function NumField({ label, value, onChange, unit, min = 0.1, step = 0.1 }) {
  return (
    <div>
      <label className="block text-xs mb-0.5" style={{ color: C.dm }}>{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" value={value} onChange={e => onChange(Math.max(min, Number(e.target.value)))}
          min={min} step={step} className="w-full rounded px-2 py-1 text-sm font-mono" style={inp2} />
        {unit && <span className="text-xs whitespace-nowrap" style={{ color: C.dm }}>{unit}</span>}
      </div>
    </div>
  );
}

export function TabComponentes({ crR, inp, setI }) {
  const s = (k, v) => setI(p => ({ ...p, [k]: v }));
  const [wallView, setWallView] = useState('elev');

  // Local state for sub-element dimensions
  const surface = inp.crElementType || 'paredes';
  const subType = inp.crSubType || ELEM_TYPES[surface][0].id;
  const sep = inp.crSep ?? 1.5;
  const Ltramo = inp.crLtramo ?? 6.0;
  const sepFij = inp.crSepFij ?? 0.3;
  const manualAt = inp.crManualAt ?? false;

  // Auto At
  const autoAt = useMemo(() => calcAutoAt(subType, sep, Ltramo, sepFij), [subType, sep, Ltramo, sepFij]);
  const effectiveAt = manualAt ? (inp.crTribArea ?? 10) : autoAt;

  // Sync effectiveAt to inp.crTribArea when auto
  const needSync = !manualAt && Math.abs(effectiveAt - (inp.crTribArea ?? 10)) > 0.01;
  if (needSync) {
    // Use setTimeout to avoid setState during render
    setTimeout(() => s('crTribArea', Math.round(autoAt * 100) / 100), 0);
  }

  const zoneDesc = crR.elementType === 'paredes' ? CR_WALL_ZONE_DESC : CR_ROOF_ZONE_DESC;
  const subElem = ELEM_TYPES[surface].find(e => e.id === subType) || ELEM_TYPES[surface][0];
  const isTornillo = subType.includes('tornillo');
  const isCorrea = subType.includes('correa');
  const isChapa = !isTornillo && !isCorrea;

  // anchoEf for chapa display
  const anchoEf = isChapa ? Math.max(sep, Ltramo / 3) : null;

  return (
    <div className="p-4 max-w-5xl space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Badge>Cap. 5</Badge>
        <span className="text-sm font-bold" style={{ color: C.tx }}>Componentes y Revestimientos (C&R)</span>
      </div>

      {/* ── Row 1: Superficie + Sub-elemento ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs mb-0.5" style={{ color: C.dm }}>Superficie</label>
          <select value={surface}
            onChange={e => {
              s('crElementType', e.target.value);
              s('crSubType', ELEM_TYPES[e.target.value][0].id);
            }}
            className="w-full rounded px-2 py-1.5 text-sm" style={inp2}>
            <option value="paredes">Paredes</option>
            <option value="techos">Techos (cubierta)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs mb-0.5" style={{ color: C.dm }}>Tipo de Elemento</label>
          <div className="flex gap-1 flex-wrap">
            {ELEM_TYPES[surface].map(et => (
              <button key={et.id} onClick={() => s('crSubType', et.id)}
                className="px-2.5 py-1.5 rounded text-xs font-bold transition-colors"
                style={{
                  background: subType === et.id ? C.ac : 'transparent',
                  color: subType === et.id ? '#fff' : C.dm,
                  border: `1px solid ${subType === et.id ? C.ac : C.bd}`,
                }}>
                {et.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Dimensiones + At ── */}
      <div className="rounded-lg p-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold" style={{ color: C.tx }}>Dimensiones del Elemento</span>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: C.dm }}>
              <input type="checkbox" checked={manualAt} onChange={e => s('crManualAt', e.target.checked)} />
              At manual
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <NumField label={isCorrea || isTornillo ? 'Sep. correas [m]' : 'Sep. elementos [m]'}
            value={sep} onChange={v => s('crSep', v)} unit="m" />
          {!isTornillo && (
            <NumField label="L tramo [m]" value={Ltramo} onChange={v => s('crLtramo', v)} unit="m" />
          )}
          {isTornillo && (
            <NumField label="Sep. fijaciones [m]" value={sepFij} onChange={v => s('crSepFij', v)} unit="m" />
          )}
          {manualAt ? (
            <NumField label="At manual [m²]" value={inp.crTribArea ?? 10}
              onChange={v => s('crTribArea', v)} unit="m²" />
          ) : (
            <div>
              <label className="block text-xs mb-0.5" style={{ color: C.dm }}>At auto [m²]</label>
              <div className="rounded px-2 py-1 text-sm font-mono font-bold" style={{ background: C.bg, color: C.ac, border: `1px solid ${C.bd}` }}>
                {autoAt.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* At calculation detail */}
        {!manualAt && (
          <div className="mt-2 p-2 rounded text-xs font-mono" style={{ background: C.bg, border: `1px solid ${C.bd}`, color: C.dm }}>
            {isChapa && <>
              ancho_ef = max(sep, L/3) = max({sep.toFixed(2)}, {Ltramo.toFixed(2)}/3) = max({sep.toFixed(2)}, {(Ltramo / 3).toFixed(2)}) = <span style={{ color: C.ac, fontWeight: 'bold' }}>{anchoEf.toFixed(2)} m</span><br />
              At = ancho_ef × L = {anchoEf.toFixed(2)} × {Ltramo.toFixed(2)} = <span style={{ color: C.ac, fontWeight: 'bold' }}>{autoAt.toFixed(2)} m²</span>
            </>}
            {isCorrea && <>
              At = sep × L_tramo = {sep.toFixed(2)} × {Ltramo.toFixed(2)} = <span style={{ color: C.ac, fontWeight: 'bold' }}>{autoAt.toFixed(2)} m²</span>
            </>}
            {isTornillo && <>
              At = sep_correas × sep_fij = {sep.toFixed(2)} × {sepFij.toFixed(2)} = <span style={{ color: C.ac, fontWeight: 'bold' }}>{autoAt.toFixed(2)} m²</span>
            </>}
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap gap-3 text-xs" style={{ color: C.dm }}>
        <span>qh = <strong style={{ color: C.ac }}>{crR.qh?.toFixed(2)}</strong> kN/m²</span>
        <span>a = <strong style={{ color: C.ac }}>{crR.a?.toFixed(2)}</strong> m</span>
        <span>θ = <strong style={{ color: C.ac }}>{crR.thetaDeg?.toFixed(1)}</strong>°</span>
        <span>Cerramiento: <strong style={{ color: C.ac }}>{crR.enclosure}</strong></span>
        <span>GCpi = ±<strong style={{ color: C.ac }}>{crR.gcpi?.p}</strong></span>
        <span>At = <strong style={{ color: C.ac }}>{effectiveAt.toFixed(2)}</strong> m²</span>
      </div>

      {/* Diagrama de zonas */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold" style={{ color: C.tx }}>
            {crR.elementType === 'paredes' ? 'Zonas de Pared (Fig. 5.3-1)' : 'Zonas de Cubierta — Planta (Fig. 5.3-2)'}
          </span>
          {crR.elementType === 'paredes' && (
            <div className="flex gap-1 ml-auto">
              {[{ id: 'elev', lb: 'Elevación' }, { id: '3d', lb: '3D' }].map(v => (
                <button key={v.id} onClick={() => setWallView(v.id)}
                  className="px-2 py-0.5 rounded text-xs transition-colors"
                  style={{
                    background: wallView === v.id ? C.ac : 'transparent',
                    color: wallView === v.id ? '#fff' : C.dm,
                    border: `1px solid ${wallView === v.id ? C.ac : C.bd}`,
                  }}>
                  {v.lb}
                </button>
              ))}
            </div>
          )}
        </div>
        {crR.elementType === 'paredes'
          ? (wallView === '3d'
            ? <WallZone3D B={crR.B} L={crR.L} a={crR.a} h={crR.h} he={crR.he} />
            : <WallZoneDiagram B={crR.B} L={crR.L} a={crR.a} h={crR.h} he={crR.he} pressures={crR.pressures} />
          )
          : <RoofZoneDiagram B={crR.B} L={crR.L} a={crR.a} pressures={crR.pressures} />
        }
      </div>

      {/* Tabla de resultados */}
      <div>
        <div className="text-xs font-bold mb-1" style={{ color: C.tx }}>Presiones por Zona — {subElem.label}</div>
        <div className="rounded overflow-x-auto" style={{ border: `1px solid ${C.bd}` }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: C.bg }}>
                <th className="px-2 py-1 text-left text-xs" style={{ color: C.dm }}>Zona</th>
                <th className="px-2 py-1 text-left text-xs" style={{ color: C.dm }}>GCp+</th>
                <th className="px-2 py-1 text-left text-xs" style={{ color: C.dm }}>GCp−</th>
                <th className="px-2 py-1 text-right text-xs" style={{ color: C.dm }}>p+ [kN/m²]</th>
                <th className="px-2 py-1 text-right text-xs" style={{ color: C.dm }}>p− [kN/m²]</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(crR.pressures).map(([zone, p]) => (
                <tr key={zone} style={{ borderBottom: `1px solid ${C.bd}` }}>
                  <td className="px-2 py-1 text-xs font-bold" style={{ color: C.ac }}>Z{zone} — {zoneDesc[zone]}</td>
                  <td className="px-2 py-1 text-xs font-mono" style={{ color: C.tx }}>{p.gcpPos.toFixed(2)}</td>
                  <td className="px-2 py-1 text-xs font-mono" style={{ color: C.tx }}>{p.gcpNeg.toFixed(2)}</td>
                  <td className="px-2 py-1 text-xs font-mono font-bold text-right" style={{ color: C.pos }}>{p.pPos > 0 ? '+' : ''}{p.pPos.toFixed(2)}</td>
                  <td className="px-2 py-1 text-xs font-mono font-bold text-right" style={{ color: C.neg }}>{p.pNeg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ecuación y desarrollo */}
        <div className="mt-2 p-2 rounded text-xs font-mono" style={{ background: C.bg, border: `1px solid ${C.bd}`, color: C.dm }}>
          <strong style={{ color: C.tx }}>Ec. 5.3-1:</strong> p = qh × [(GCp) − (±GCpi)]<br />
          qh = {crR.qh?.toFixed(2)} kN/m² | GCpi = ±{crR.gcpi?.p} | At = {effectiveAt.toFixed(2)} m²<br />
          Elemento: {subElem.label} ({surface === 'paredes' ? 'Pared' : 'Cubierta'})
        </div>
      </div>

      {/* Tabla resumen de dimensiones */}
      <div className="rounded overflow-hidden" style={{ border: `1px solid ${C.bd}` }}>
        <div className="px-3 py-1.5 text-xs font-bold" style={{ background: C.bg, color: C.tx, borderBottom: `1px solid ${C.bd}` }}>
          Resumen de Dimensiones
        </div>
        <table className="w-full text-xs font-mono">
          <tbody>
            <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <td className="px-3 py-1" style={{ color: C.dm }}>Superficie</td>
              <td className="px-3 py-1 font-bold" style={{ color: C.tx }}>{surface === 'paredes' ? 'Paredes' : 'Cubierta'}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <td className="px-3 py-1" style={{ color: C.dm }}>Elemento</td>
              <td className="px-3 py-1 font-bold" style={{ color: C.tx }}>{subElem.label}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <td className="px-3 py-1" style={{ color: C.dm }}>Separación</td>
              <td className="px-3 py-1 font-bold" style={{ color: C.tx }}>{sep.toFixed(2)} m</td>
            </tr>
            {!isTornillo && <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <td className="px-3 py-1" style={{ color: C.dm }}>L tramo</td>
              <td className="px-3 py-1 font-bold" style={{ color: C.tx }}>{Ltramo.toFixed(2)} m</td>
            </tr>}
            {isTornillo && <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <td className="px-3 py-1" style={{ color: C.dm }}>Sep. fijaciones</td>
              <td className="px-3 py-1 font-bold" style={{ color: C.tx }}>{sepFij.toFixed(2)} m</td>
            </tr>}
            {isChapa && <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <td className="px-3 py-1" style={{ color: C.dm }}>Ancho efectivo</td>
              <td className="px-3 py-1 font-bold" style={{ color: C.ac }}>max({sep.toFixed(2)}, {(Ltramo / 3).toFixed(2)}) = {anchoEf.toFixed(2)} m</td>
            </tr>}
            <tr>
              <td className="px-3 py-1" style={{ color: C.dm }}>At efectiva</td>
              <td className="px-3 py-1 font-bold" style={{ color: C.ac }}>{effectiveAt.toFixed(2)} m²{manualAt ? ' (manual)' : ' (auto)'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Referencia CIRSOC */}
      {crR.elementType === 'paredes' ? (
        <CirsocImg src="/cirsoc/image14.png" alt="Fig 5.3-1 GCp paredes" title="Referencia: Fig. 5.3-1 — GCp Paredes C&R" />
      ) : (
        <>
          <CirsocImg src="/cirsoc/image15.png" alt="Fig 5.3-2A GCp cubierta plana" title="Referencia: Fig. 5.3-2A — GCp Cubierta θ ≤ 7°" />
          <CirsocImg src="/cirsoc/image16.png" alt="Fig 5.3-2B GCp cubierta 7-27" title="Referencia: Fig. 5.3-2B — GCp Cubierta 7° < θ ≤ 27°" />
          <CirsocImg src="/cirsoc/image17.png" alt="Fig 5.3-2C GCp cubierta 27-45" title="Referencia: Fig. 5.3-2C — GCp Cubierta 27° < θ ≤ 45°" />
        </>
      )}
    </div>
  );
}
