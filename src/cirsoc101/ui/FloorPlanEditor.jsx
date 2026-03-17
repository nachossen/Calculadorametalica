/**
 * cirsoc101/ui/FloorPlanEditor.jsx — Planta estructural interactiva
 * Cap. 4.7.2 CIRSOC 101-2025: Áreas tributarias, influencia y reducción global
 *
 * Unificado: selector de uso, pisos, voladizos, grilla, offsets, override KLL, tabla global
 */

import { useState, useMemo, useEffect } from 'react';
import { C } from '../../ui/common/theme.js';
import { calcTributaryArea } from '../core/tributaryArea.js';
import { reduceLiveLoad, KLL_FACTORS } from '../core/liveLoadReduction.js';
import { SOBRECARGAS_USO } from '../data/sobrecargasUso.js';

const PAD = 60;
const LABEL_OFF = 20;

function buildGrid(cols, rows, cant) {
  let x = 0;
  const gx = [0];
  for (const s of cols) { x += s; gx.push(x); }
  let y = 0;
  const gy = [0];
  for (const s of rows) { y += s; gy.push(y); }

  // Extend grid with cantilevers
  if (cant.left > 0)   gx.unshift(-cant.left);
  if (cant.right > 0)  gx.push(gx[gx.length - 1] + cant.right);
  if (cant.bottom > 0) gy.unshift(-cant.bottom);
  if (cant.top > 0)    gy.push(gy[gy.length - 1] + cant.top);

  return { gx, gy };
}

/** Auto-detect KLL based on column position and cantilevers */
function detectKLL(ci, ri, nx, ny, cant) {
  const isEdgeX = ci === 0 || ci === nx - 1;
  const isEdgeY = ri === 0 || ri === ny - 1;
  const hasVolLeft   = cant.left > 0;
  const hasVolRight  = cant.right > 0;
  const hasVolBottom = cant.bottom > 0;
  const hasVolTop    = cant.top > 0;

  // Check if edge column has cantilever extending beyond it
  const edgeXwithVol =
    (ci === 0 && hasVolLeft) ||
    (ci === nx - 1 && hasVolRight);
  const edgeYwithVol =
    (ri === 0 && hasVolBottom) ||
    (ri === ny - 1 && hasVolTop);

  if (isEdgeX && isEdgeY) {
    // Corner — if any cantilever extends from this corner
    if (edgeXwithVol || edgeYwithVol)
      return { kll: 3, tipo: 'Borde c/vol.', key: 'COLUMNA_BORDE_CON_VOLADIZO' };
    return { kll: 2, tipo: 'Esquina', key: 'COLUMNA_ESQUINA' };
  }
  if (isEdgeX || isEdgeY) {
    if ((isEdgeX && edgeXwithVol) || (isEdgeY && edgeYwithVol))
      return { kll: 3, tipo: 'Borde c/vol.', key: 'COLUMNA_BORDE_CON_VOLADIZO' };
    return { kll: 4, tipo: 'Exterior', key: 'COLUMNA_EXTERIOR_SIN_VOLADIZO' };
  }
  return { kll: 4, tipo: 'Interior', key: 'COLUMNA_INTERIOR' };
}

export function FloorPlanEditor({ liveInp, setLiveInp, onGoverningL }) {
  const [cols, setCols] = useState([6, 6, 6]);
  const [rows, setRows] = useState([5, 5]);
  const [sel, setSel] = useState({ col: 0, row: 0 });
  const [showInfluence, setShowInfluence] = useState(true);
  const [deleted, setDeleted] = useState(new Set());
  const [kllOverrides, setKllOverrides] = useState({});
  const [cant, setCant] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const [offsets, setOffsets] = useState({});

  // Derive L0 and pisos from liveInp
  const sc = SOBRECARGAS_USO.find(s => s.id === liveInp.usoId) || SOBRECARGAS_USO[0];
  const L0 = sc.L0;
  const pisos = liveInp.pisos || 1;

  const setL = (k, v) => setLiveInp(p => ({ ...p, [k]: v }));

  const { gx, gy } = useMemo(() => buildGrid(cols, rows, cant), [cols, rows, cant]);
  const nx = gx.length;
  const ny = gy.length;

  // Clamp selection when grid shrinks
  useEffect(() => {
    if (sel.col >= nx) setSel(s => ({ ...s, col: nx - 1 }));
    if (sel.row >= ny) setSel(s => ({ ...s, row: ny - 1 }));
  }, [nx, ny]);

  const selKey = `${sel.col}-${sel.row}`;
  const isDeleted = deleted.has(selKey);

  const trib = useMemo(
    () => calcTributaryArea(gx, gy, sel.col, sel.row),
    [gx, gy, sel.col, sel.row]
  );

  // Global reduction table for ALL columns
  const globalTable = useMemo(() => {
    const table = [];
    for (let ci = 0; ci < nx; ci++) {
      for (let ri = 0; ri < ny; ri++) {
        const key = `${ci}-${ri}`;
        if (deleted.has(key)) continue;
        const t = calcTributaryArea(gx, gy, ci, ri);
        const auto = detectKLL(ci, ri, nx, ny, cant);
        const overrideKey = kllOverrides[key];
        const kll = overrideKey ? KLL_FACTORS[overrideKey] : auto.kll;
        const tipo = overrideKey ? overrideKey.replace(/_/g, ' ') : auto.tipo;
        const AI = kll * t.AT;
        const red = reduceLiveLoad(L0, kll, t.AT, { pisos, usoId: liveInp.usoId });
        table.push({
          key, ci, ri, tipo, kll, AT: t.AT, AI, L: red.L, factor: red.factor,
          reducida: red.reducida, motivo: red.motivo,
          label: `${ci + 1}-${String.fromCharCode(65 + ri)}`,
          overridden: !!overrideKey,
        });
      }
    }
    return table;
  }, [gx, gy, deleted, L0, pisos, liveInp.usoId, nx, ny, kllOverrides, cant]);

  // Find worst (least reduced) column
  const worst = globalTable.reduce((w, c) => (!w || c.L > w.L) ? c : w, null);

  // Notify parent of governing L
  useEffect(() => {
    if (onGoverningL && worst) onGoverningL(worst.L);
  }, [worst?.L, onGoverningL]);

  // SVG dimensions — account for negative coordinates from cantilevers
  const minX = Math.min(...gx);
  const maxX = Math.max(...gx);
  const minY = Math.min(...gy);
  const maxY = Math.max(...gy);
  const totalW = maxX - minX;
  const totalH = maxY - minY;
  const sc2 = Math.min(500 / Math.max(totalW, 1), 350 / Math.max(totalH, 1), 50);
  const svgW = totalW * sc2 + PAD * 2;
  const svgH = totalH * sc2 + PAD * 2;
  const txF = x => PAD + (x - minX) * sc2;
  const tyF = y => PAD + (maxY - y) * sc2;

  // Core grid bounds (without cantilevers) for hatching
  const coreMinX = 0;
  const coreMaxX = cols.reduce((a, b) => a + b, 0);
  const coreMinY = 0;
  const coreMaxY = rows.reduce((a, b) => a + b, 0);

  const updateCol = (i, v) => setCols(c => c.map((s, j) => j === i ? Math.max(1, v) : s));
  const updateRow = (i, v) => setRows(r => r.map((s, j) => j === i ? Math.max(1, v) : s));
  const addCol = () => setCols(c => [...c, 5]);
  const addRow = () => setRows(r => [...r, 5]);
  const remCol = () => { if (cols.length > 1) setCols(c => c.slice(0, -1)); };
  const remRow = () => { if (rows.length > 1) setRows(r => r.slice(0, -1)); };

  const toggleDelete = () => {
    setDeleted(d => {
      const nd = new Set(d);
      if (nd.has(selKey)) nd.delete(selKey); else nd.add(selKey);
      return nd;
    });
  };

  const colLabels = gx.map((_, i) => String(i + 1));
  const rowLabels = gy.map((_, i) => String.fromCharCode(65 + i));

  const selAuto = detectKLL(sel.col, sel.row, nx, ny, cant);
  const selKllOverride = kllOverrides[selKey];
  const selOffset = offsets[selKey] || { dx: 0, dy: 0 };

  return (
    <div className="space-y-3">

      {/* Uso ocupacional + pisos */}
      <div className="rounded-lg p-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <div className="text-xs font-bold mb-2" style={{ color: C.tx }}>Uso / Ocupación y Pisos</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs mb-1" style={{ color: C.dm }}>Uso ocupacional</label>
            <select value={liveInp.usoId} onChange={e => setL('usoId', e.target.value)}
              className="w-full rounded px-2 py-1.5 text-sm" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}>
              {SOBRECARGAS_USO.map(s => <option key={s.id} value={s.id}>{s.uso} — {s.L} kN/m²</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dm }}>Pisos soportados</label>
            <input type="number" value={pisos} onChange={e => setL('pisos', Math.max(1, Number(e.target.value)))}
              min={1} max={20} step={1} className="w-full rounded px-2 py-1.5 text-sm font-mono"
              style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-xs" style={{ color: C.dm }}>
          <span>L = <strong style={{ color: C.ac }}>{sc.L}</strong> kN/m²</span>
          <span>L₀ = <strong style={{ color: C.ac }}>{sc.L0}</strong> kN/m²</span>
          {pisos > 1 && <span>Pisos: <strong style={{ color: C.ac }}>{pisos}</strong></span>}
        </div>
      </div>

      {/* Cantilevers */}
      <div className="rounded-lg p-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <div className="text-xs font-bold mb-2" style={{ color: C.tx }}>Voladizos (cantilevers)</div>
        <div className="grid grid-cols-4 gap-2">
          {[['Izq.', 'left'], ['Der.', 'right'], ['Inf.', 'bottom'], ['Sup.', 'top']].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs mb-0.5" style={{ color: C.dm }}>{label}</label>
              <input type="number" value={cant[key]} onChange={e => setCant(c => ({ ...c, [key]: Math.max(0, Number(e.target.value)) }))}
                min={0} step={0.5} className="w-full rounded px-1 py-0.5 text-xs font-mono text-center"
                style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
            </div>
          ))}
        </div>
        <div className="text-xs mt-1" style={{ color: C.dm }}>
          Columnas de borde con voladizo → K_LL = 3 (COLUMNA_BORDE_CON_VOLADIZO)
        </div>
      </div>

      {/* Grid controls */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 items-center">
          <span className="text-xs" style={{ color: C.dm }}>Ejes X:</span>
          {cols.map((s, i) => (
            <input key={`c${i}`} type="number" value={s} onChange={e => updateCol(i, Number(e.target.value))}
              min={1} step={0.5} className="w-14 rounded px-1 py-0.5 text-xs font-mono text-center"
              style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
          ))}
          <button onClick={addCol} className="px-1.5 py-0.5 rounded text-xs" style={{ color: C.ac, border: `1px solid ${C.bd}` }}>+</button>
          <button onClick={remCol} className="px-1.5 py-0.5 rounded text-xs" style={{ color: '#ef4444', border: `1px solid ${C.bd}` }}>-</button>
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-xs" style={{ color: C.dm }}>Ejes Y:</span>
          {rows.map((s, i) => (
            <input key={`r${i}`} type="number" value={s} onChange={e => updateRow(i, Number(e.target.value))}
              min={1} step={0.5} className="w-14 rounded px-1 py-0.5 text-xs font-mono text-center"
              style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
          ))}
          <button onClick={addRow} className="px-1.5 py-0.5 rounded text-xs" style={{ color: C.ac, border: `1px solid ${C.bd}` }}>+</button>
          <button onClick={remRow} className="px-1.5 py-0.5 rounded text-xs" style={{ color: '#ef4444', border: `1px solid ${C.bd}` }}>-</button>
        </div>
        <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: C.dm }}>
          <input type="checkbox" checked={showInfluence} onChange={e => setShowInfluence(e.target.checked)} />
          Area de influencia
        </label>
      </div>

      {/* SVG Plan */}
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ maxHeight: 420, background: C.cd, borderRadius: 8, border: `1px solid ${C.bd}` }}>
        <defs>
          <pattern id="cant-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(56,189,248,0.15)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Cantilever zones (hatched) */}
        {cant.left > 0 && (
          <rect x={txF(minX)} y={tyF(maxY)} width={cant.left * sc2} height={totalH * sc2}
            fill="url(#cant-hatch)" stroke="rgba(56,189,248,0.3)" strokeWidth={0.5} strokeDasharray="3 2" />
        )}
        {cant.right > 0 && (
          <rect x={txF(coreMaxX)} y={tyF(maxY)} width={cant.right * sc2} height={totalH * sc2}
            fill="url(#cant-hatch)" stroke="rgba(56,189,248,0.3)" strokeWidth={0.5} strokeDasharray="3 2" />
        )}
        {cant.bottom > 0 && (
          <rect x={txF(minX)} y={tyF(coreMinY)} width={totalW * sc2} height={cant.bottom * sc2}
            fill="url(#cant-hatch)" stroke="rgba(56,189,248,0.3)" strokeWidth={0.5} strokeDasharray="3 2" />
        )}
        {cant.top > 0 && (
          <rect x={txF(minX)} y={tyF(maxY)} width={totalW * sc2} height={cant.top * sc2}
            fill="url(#cant-hatch)" stroke="rgba(56,189,248,0.3)" strokeWidth={0.5} strokeDasharray="3 2" />
        )}

        {/* Influence area for selected column */}
        {showInfluence && trib.AI > 0 && !isDeleted && (
          <rect x={txF(trib.influenceBounds.x)} y={tyF(trib.influenceBounds.y + trib.influenceBounds.h)}
            width={trib.influenceBounds.w * sc2} height={trib.influenceBounds.h * sc2}
            fill="rgba(234,179,8,0.12)" stroke="#eab308" strokeWidth={1} strokeDasharray="4 2" />
        )}
        {trib.AT > 0 && !isDeleted && (
          <rect x={txF(trib.tribBounds.x)} y={tyF(trib.tribBounds.y + trib.tribBounds.h)}
            width={trib.tribBounds.w * sc2} height={trib.tribBounds.h * sc2}
            fill="rgba(56,189,248,0.2)" stroke="#38bdf8" strokeWidth={1.5} />
        )}

        {/* Grid lines */}
        {gx.map((x, i) => (
          <line key={`vl${i}`} x1={txF(x)} y1={tyF(minY)} x2={txF(x)} y2={tyF(maxY)} stroke={C.bd} strokeWidth={0.5} />
        ))}
        {gy.map((y, i) => (
          <line key={`hl${i}`} x1={txF(minX)} y1={tyF(y)} x2={txF(maxX)} y2={tyF(y)} stroke={C.bd} strokeWidth={0.5} />
        ))}

        {/* Column nodes */}
        {gx.map((x, ci) => gy.map((y, ri) => {
          const key = `${ci}-${ri}`;
          const del = deleted.has(key);
          const isSel = sel.col === ci && sel.row === ri;
          const off = offsets[key] || { dx: 0, dy: 0 };
          const cx = txF(x) + off.dx * sc2;
          const cy = tyF(y) - off.dy * sc2;
          return (
            <g key={`n${key}`}>
              <circle cx={cx} cy={cy} r={isSel ? 6 : 4}
                fill={del ? '#555' : isSel ? C.ac : C.dm}
                stroke={isSel ? '#fff' : 'none'} strokeWidth={1.5}
                opacity={del ? 0.4 : 1}
                className="cursor-pointer"
                onClick={() => setSel({ col: ci, row: ri })} />
              {del && (
                <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4}
                  stroke="#ef4444" strokeWidth={1.5} />
              )}
              {/* Show offset line */}
              {(off.dx !== 0 || off.dy !== 0) && !del && (
                <line x1={txF(x)} y1={tyF(y)} x2={cx} y2={cy}
                  stroke="rgba(249,115,22,0.5)" strokeWidth={0.8} strokeDasharray="2 2" />
              )}
            </g>
          );
        }))}

        {/* Labels */}
        {gx.map((x, i) => (
          <text key={`lx${i}`} x={txF(x)} y={tyF(maxY) - LABEL_OFF} textAnchor="middle"
            fill={C.dm} fontSize={10} fontFamily="monospace">{colLabels[i]}</text>
        ))}
        {gy.map((y, i) => (
          <text key={`ly${i}`} x={txF(minX) - LABEL_OFF} y={tyF(y) + 4} textAnchor="middle"
            fill={C.dm} fontSize={10} fontFamily="monospace">{rowLabels[i]}</text>
        ))}

        {/* Span dimensions - only for core grid spans */}
        {cols.map((s, i) => {
          const baseIdx = cant.left > 0 ? 1 : 0;
          return (
            <text key={`dx${i}`} x={txF((gx[baseIdx + i] + gx[baseIdx + i + 1]) / 2)} y={tyF(minY) + 18} textAnchor="middle"
              fill={C.ac} fontSize={9} fontFamily="monospace">{s.toFixed(1)}m</text>
          );
        })}
        {rows.map((s, i) => {
          const baseIdx = cant.bottom > 0 ? 1 : 0;
          return (
            <text key={`dy${i}`} x={txF(maxX) + 18} y={tyF((gy[baseIdx + i] + gy[baseIdx + i + 1]) / 2) + 3} textAnchor="middle"
              fill={C.ac} fontSize={9} fontFamily="monospace">{s.toFixed(1)}m</text>
          );
        })}

        {/* Selected column label */}
        {sel.col < nx && sel.row < ny && (
          <text x={txF(gx[sel.col]) + (selOffset.dx * sc2)} y={tyF(gy[sel.row]) - (selOffset.dy * sc2) - 12} textAnchor="middle"
            fill={C.ac} fontSize={10} fontWeight="bold" fontFamily="monospace">
            {colLabels[sel.col]}-{rowLabels[sel.row]}
          </text>
        )}
      </svg>

      {/* Selected column controls */}
      <div className="rounded-lg p-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="text-xs font-bold" style={{ color: C.tx }}>
            Col. {colLabels[sel.col]}-{rowLabels[sel.row]}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
            {selAuto.tipo}
          </span>
          <button onClick={toggleDelete} className="text-xs px-2 py-0.5 rounded"
            style={{ color: isDeleted ? C.ac : '#ef4444', border: `1px solid ${C.bd}` }}>
            {isDeleted ? 'Restaurar' : 'Eliminar'}
          </button>
        </div>

        {!isDeleted && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-xs mb-0.5" style={{ color: C.dm }}>K_LL (override)</label>
                <select value={selKllOverride || '__auto__'}
                  onChange={e => {
                    const v = e.target.value;
                    setKllOverrides(o => {
                      const next = { ...o };
                      if (v === '__auto__') delete next[selKey];
                      else next[selKey] = v;
                      return next;
                    });
                  }}
                  className="w-full rounded px-1 py-0.5 text-xs"
                  style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}>
                  <option value="__auto__">Auto ({selAuto.tipo} = {selAuto.kll})</option>
                  {Object.entries(KLL_FACTORS).map(([k, v]) => (
                    <option key={k} value={k}>{k.replace(/_/g, ' ')} ({v})</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs" style={{ color: C.dm }}>AT</div>
                <div className="text-sm font-mono font-bold" style={{ color: '#38bdf8' }}>{trib.AT.toFixed(2)} m²</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: C.dm }}>AI = K_LL x AT</div>
                <div className="text-sm font-mono font-bold" style={{ color: '#eab308' }}>
                  {((selKllOverride ? KLL_FACTORS[selKllOverride] : selAuto.kll) * trib.AT).toFixed(2)} m²
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: C.dm }}>K_LL</div>
                <div className="text-sm font-mono font-bold" style={{ color: selKllOverride ? '#f97316' : C.ac }}>
                  {selKllOverride ? KLL_FACTORS[selKllOverride] : selAuto.kll}
                  {selKllOverride && <span className="text-xs ml-1" style={{ color: '#f97316' }}>(manual)</span>}
                </div>
              </div>
            </div>

            {/* Offsets */}
            <div className="flex gap-3 items-center">
              <span className="text-xs" style={{ color: C.dm }}>Offset:</span>
              <div className="flex gap-1 items-center">
                <label className="text-xs" style={{ color: C.dm }}>ΔX</label>
                <input type="number" value={selOffset.dx} step={0.1}
                  onChange={e => {
                    const dx = Number(e.target.value) || 0;
                    setOffsets(o => ({ ...o, [selKey]: { ...selOffset, dx } }));
                  }}
                  className="w-16 rounded px-1 py-0.5 text-xs font-mono text-center"
                  style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
              </div>
              <div className="flex gap-1 items-center">
                <label className="text-xs" style={{ color: C.dm }}>ΔY</label>
                <input type="number" value={selOffset.dy} step={0.1}
                  onChange={e => {
                    const dy = Number(e.target.value) || 0;
                    setOffsets(o => ({ ...o, [selKey]: { ...selOffset, dy } }));
                  }}
                  className="w-16 rounded px-1 py-0.5 text-xs font-mono text-center"
                  style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }} />
              </div>
              <span className="text-xs" style={{ color: C.dm }}>m</span>
            </div>
            {(selOffset.dx !== 0 || selOffset.dy !== 0) && (
              <div className="text-xs italic" style={{ color: '#f97316' }}>
                Offsets son solo visualización; AT se calcula con la grilla base.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global reduction table */}
      <div className="rounded-lg p-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <div className="text-xs font-bold mb-2" style={{ color: C.tx }}>
          Reducción Global — L₀ = {L0} kN/m² | {pisos} piso{pisos > 1 ? 's' : ''}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Col', 'Tipo', 'K_LL', 'AT [m²]', 'AI [m²]', 'Factor', 'L [kN/m²]'].map(h => (
                  <th key={h} className="text-left px-2 py-1" style={{ color: C.dm, borderBottom: `1px solid ${C.bd}`, fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {globalTable.map(r => (
                <tr key={r.key} style={{
                  borderBottom: `1px solid ${C.bd}`,
                  background: r.key === selKey ? 'rgba(56,189,248,0.08)' : worst && r.key === worst.key ? 'rgba(234,179,8,0.06)' : 'transparent',
                }}>
                  <td className="px-2 py-0.5" style={{ color: r.key === selKey ? C.ac : C.tx, fontWeight: r.key === selKey ? 'bold' : 'normal' }}>{r.label}</td>
                  <td className="px-2 py-0.5" style={{ color: r.overridden ? '#f97316' : C.dm }}>{r.tipo}</td>
                  <td className="px-2 py-0.5" style={{ color: r.overridden ? '#f97316' : C.tx }}>{r.kll}</td>
                  <td className="px-2 py-0.5" style={{ color: C.tx }}>{r.AT.toFixed(1)}</td>
                  <td className="px-2 py-0.5" style={{ color: C.tx }}>{r.AI.toFixed(1)}</td>
                  <td className="px-2 py-0.5" style={{ color: r.reducida ? C.ac : C.dm }}>{r.factor.toFixed(3)}</td>
                  <td className="px-2 py-0.5 font-bold" style={{ color: worst && r.key === worst.key ? '#eab308' : r.reducida ? C.ac : C.tx }}>{r.L.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {worst && (
          <div className="mt-2 text-xs" style={{ color: '#eab308' }}>
            Columna gobernante: {worst.label} ({worst.tipo}) — L = {worst.L.toFixed(3)} kN/m²
          </div>
        )}
      </div>

      {/* Engineering note */}
      <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(56,189,248,0.06)', border: `1px solid rgba(56,189,248,0.3)`, color: C.dm }}>
        <div className="font-bold mb-1" style={{ color: C.ac }}>Art. 4.7 CIRSOC 101-2025 — Reducción por elemento</div>
        <ul className="space-y-1 ml-3" style={{ listStyleType: 'disc' }}>
          <li>La reducción de sobrecarga es <strong style={{ color: C.tx }}>por elemento estructural</strong>, no por planta.</li>
          <li>Un promedio ponderado areal de L reducida <strong style={{ color: '#ef4444' }}>no está permitido</strong> (la fórmula Ec. 4.1 es no-lineal).</li>
          <li>Para predimensionado, puede adoptarse conservadoramente el <strong style={{ color: '#eab308' }}>valor gobernante</strong>
            {worst && <> (Col. {worst.label}, L = {worst.L.toFixed(3)} kN/m²)</>} para todos los elementos.
          </li>
        </ul>
      </div>

      {deleted.size > 0 && (
        <div className="text-xs" style={{ color: C.dm }}>
          Columnas eliminadas: {Array.from(deleted).map(k => {
            const [ci, ri] = k.split('-').map(Number);
            return `${ci + 1}-${String.fromCharCode(65 + ri)}`;
          }).join(', ')}
        </div>
      )}

      {/* Collapsible reference table */}
      <details className="rounded-lg" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <summary className="px-3 py-2 text-xs font-bold cursor-pointer" style={{ color: C.tx }}>
          Tabla de Sobrecargas de Uso (Referencia)
        </summary>
        <div className="px-3 pb-3 overflow-auto" style={{ maxHeight: 300 }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: C.bg }}>
                <th className="px-2 py-1 text-left text-xs" style={{ color: C.dm }}>Uso</th>
                <th className="px-2 py-1 text-right text-xs" style={{ color: C.dm }}>L [kN/m²]</th>
                <th className="px-2 py-1 text-right text-xs" style={{ color: C.dm }}>L₀ [kN/m²]</th>
              </tr>
            </thead>
            <tbody>
              {SOBRECARGAS_USO.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${C.bd}`, background: s.id === liveInp.usoId ? 'rgba(56,189,248,0.08)' : 'transparent' }}>
                  <td className="px-2 py-1 text-xs" style={{ color: s.id === liveInp.usoId ? C.ac : C.tx }}>{s.uso}</td>
                  <td className="px-2 py-1 text-xs text-right font-mono" style={{ color: C.tx }}>{s.L}</td>
                  <td className="px-2 py-1 text-xs text-right font-mono" style={{ color: C.tx }}>{s.L0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
