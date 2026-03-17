/**
 * roofTypes/unaAgua/geometry2D.jsx — Sección transversal 2D (1 agua)
 * Mejorado: zoom, dropdown soporte, fuerzas kN/m, perfil de presiones
 */

import { useState } from 'react';
import { C } from '../../ui/common/theme.js';

function drawDistLoad(x1, y1, x2, y2, w, side) {
  if (Math.abs(w) < 0.01) return null;
  const col = w > 0 ? C.pos : C.neg;
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const mag = Math.min(Math.abs(w) * 3, 25);
  const dir = w > 0 ? -1 : 1;
  const els = [];
  const n2 = 6;
  for (let i = 0; i <= n2; i++) {
    const t = i / n2;
    const px = x1 + dx * t, py = y1 + dy * t;
    els.push(<line key={i} x1={px} y1={py} x2={px + nx * mag * dir} y2={py + ny * mag * dir} stroke={col} strokeWidth={0.8} opacity={0.5} />);
  }
  const bx1 = x1 + nx * mag * dir, by1 = y1 + ny * mag * dir;
  const bx2 = x2 + nx * mag * dir, by2 = y2 + ny * mag * dir;
  els.push(<line key="bl" x1={bx1} y1={by1} x2={bx2} y2={by2} stroke={col} strokeWidth={1} opacity={0.6} />);
  const mx2 = (bx1 + bx2) / 2, my2 = (by1 + by2) / 2;
  els.push(<text key="lb" x={mx2 + (side === 'r' ? 4 : -4)} y={my2 - 4} fill={col} fontSize={8} fontFamily="monospace" fontWeight="bold" textAnchor={side === 'r' ? 'start' : 'end'}>{w.toFixed(2)} kN/m</text>);
  return <g>{els}</g>;
}

function drawSupport(x, y, type) {
  if (type === 'Empotrado') {
    return <g><line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke={C.tx} strokeWidth={2} />
      {[-6, -2, 2, 6].map(d => <line key={d} x1={x + d} y1={y} x2={x + d - 3} y2={y + 6} stroke={C.tx} strokeWidth={1} />)}</g>;
  }
  return <g><polygon points={`${x},${y} ${x - 8},${y + 12} ${x + 8},${y + 12}`} fill="none" stroke={C.tx} strokeWidth={1.5} />
    <line x1={x - 10} y1={y + 13} x2={x + 10} y2={y + 13} stroke={C.tx} strokeWidth={1.5} /></g>;
}

function drawReaction(x, y, val, dir, label) {
  if (Math.abs(val) < 0.01) return null;
  const col = '#f97316';
  const len2 = 20;
  const sx = dir === 'h' ? (val > 0 ? x - len2 : x + len2) : x;
  const sy = dir === 'v' ? (val > 0 ? y + len2 : y - len2) : y;
  return <g>
    <line x1={sx} y1={sy} x2={x} y2={y} stroke={col} strokeWidth={2} markerEnd="url(#ar)" />
    <text x={sx + (dir === 'h' ? (val > 0 ? -3 : 3) : 8)} y={sy + (dir === 'v' ? (val > 0 ? 5 : -3) : 0)} fill={col} fontSize={8} fontFamily="monospace" fontWeight="bold" textAnchor={dir === 'h' ? (val > 0 ? 'end' : 'start') : 'start'}>{label}</text>
  </g>;
}

/** Perfil de presión en pared BV vs altura */
function PressureProfile({ r }) {
  const W = 560, H = 380, m = 60;
  const graphW = W - m * 2, graphH = H - m * 2;
  const maxP = Math.max(Math.abs(r.pWW.max), Math.abs(r.pWW.min), Math.abs(r.pLW.max), 1);
  const maxH2 = r.hc * 1.1;

  const qzProf = r.qzProf || [];
  const G = r.G || 0.85;
  const cpWW = r.cpWW || 0.8;
  const gcpiP = r.gcpi?.p || 0;
  const gcpiN = r.gcpi?.n || 0;

  const toX = p => m + (p / maxP + 1) * graphW / 2;
  const toY = z => m + graphH - (z / maxH2) * graphH;

  const wwMax = qzProf.map(pt => ({ z: pt.z, p: pt.qz * G * cpWW - r.qh * gcpiN }));
  const wwMin = qzProf.map(pt => ({ z: pt.z, p: pt.qz * G * cpWW - r.qh * gcpiP }));

  const makePath = pts => pts.map((pt, i) => `${i ? 'L' : 'M'}${toX(pt.p)},${toY(pt.z)}`).join('');

  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 360 }}>
    <line x1={m} y1={m} x2={m} y2={m + graphH} stroke={C.dm} strokeWidth={1} />
    <line x1={m} y1={m + graphH} x2={m + graphW} y2={m + graphH} stroke={C.dm} strokeWidth={1} />
    <line x1={toX(0)} y1={m} x2={toX(0)} y2={m + graphH} stroke={C.bd} strokeWidth={0.5} strokeDasharray="4,3" />

    {[-0.5, 0.5].map(f => (
      <g key={f}>
        <line x1={toX(f * maxP)} y1={m} x2={toX(f * maxP)} y2={m + graphH} stroke={C.bd} strokeWidth={0.3} />
        <text x={toX(f * maxP)} y={m + graphH + 14} fill={C.dm} fontSize={8} textAnchor="middle" fontFamily="monospace">{(f * maxP).toFixed(0)}</text>
      </g>
    ))}
    {[0.25, 0.5, 0.75, 1].map(f => (
      <g key={f}>
        <line x1={m} y1={toY(f * maxH2)} x2={m + graphW} y2={toY(f * maxH2)} stroke={C.bd} strokeWidth={0.3} />
        <text x={m - 4} y={toY(f * maxH2) + 3} fill={C.dm} fontSize={8} textAnchor="end" fontFamily="monospace">{(f * maxH2).toFixed(1)}</text>
      </g>
    ))}

    <path d={makePath(wwMax)} fill="none" stroke={C.pos} strokeWidth={2} />
    <path d={makePath(wwMin)} fill="none" stroke={C.neg} strokeWidth={2} strokeDasharray="4,2" />

    <text x={m + graphW / 2} y={m + graphH + 30} fill={C.dm} fontSize={9} textAnchor="middle" fontFamily="monospace">Presion [Pa]</text>
    <text x={m - 30} y={m + graphH / 2} fill={C.dm} fontSize={9} textAnchor="middle" fontFamily="monospace" transform={`rotate(-90, ${m - 30}, ${m + graphH / 2})`}>Altura z [m]</text>
    <text x={W / 2} y={14} fill={C.dm} fontSize={10} fontFamily="monospace" textAnchor="middle" fontWeight="bold">Perfil de Presion — Pared Barlovento</text>

    <g transform={`translate(${W - 130}, ${m})`}>
      <rect x={0} y={0} width={120} height={36} rx={3} fill={C.cd} stroke={C.bd} strokeWidth={0.5} />
      <line x1={6} y1={12} x2={24} y2={12} stroke={C.pos} strokeWidth={2} />
      <text x={28} y={15} fill={C.tx} fontSize={8}>p max (GCpi-)</text>
      <line x1={6} y1={26} x2={24} y2={26} stroke={C.neg} strokeWidth={2} strokeDasharray="4,2" />
      <text x={28} y={29} fill={C.tx} fontSize={8}>p min (GCpi+)</text>
    </g>

    <line x1={m - 8} y1={toY(r.h)} x2={m + 8} y2={toY(r.h)} stroke={C.ac} strokeWidth={2} />
    <text x={m + 12} y={toY(r.h) + 3} fill={C.ac} fontSize={8} fontFamily="monospace">h={r.h.toFixed(1)}m</text>
  </svg>;
}

/** Render2D para cubierta a 1 agua */
export function Render2D({ r, ff, onSupportChange }) {
  const [zoom, setZoom] = useState(1);
  const [showProfile, setShowProfile] = useState(false);

  if (showProfile) {
    return (
      <div className="relative">
        <div className="absolute top-1 right-1 z-10 flex gap-1">
          <button onClick={() => setShowProfile(false)} className="px-2 py-0.5 rounded text-xs" style={{ background: C.cd, color: C.ac, border: `1px solid ${C.bd}` }}>Seccion</button>
        </div>
        <PressureProfile r={r} />
      </div>
    );
  }

  const W = 560, H = 380, m = 55;
  const bw = W - m * 2 - 90;
  const maxH = Math.max(r.hc, 14);
  const sc = (H - m * 2 - 30) / maxH;
  const we = r.he * sc, wc = r.hc * sc;
  const base = H - m - 10;
  const lx = m + 45, rx = lx + bw;
  const isParallel = !r.isNorm;

  return (
    <div className="relative" onWheel={e => { e.preventDefault(); setZoom(z => Math.max(0.5, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1)))); }}>
      <div className="absolute top-1 left-1 z-10 flex gap-1 items-center">
        <select value={ff.isEmp ? 'Empotrado' : 'Articulado'} onChange={e => onSupportChange?.(e.target.value)}
          className="px-1.5 py-0.5 rounded text-xs" style={{ background: C.cd, color: C.ac, border: `1px solid ${C.bd}`, fontSize: 10 }}>
          <option value="Empotrado">Empotrado</option>
          <option value="Articulado">Articulado</option>
        </select>
      </div>
      <div className="absolute top-1 right-1 z-10 flex gap-1">
        <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: C.cd, color: C.tx, border: `1px solid ${C.bd}` }}>+</button>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: C.cd, color: C.tx, border: `1px solid ${C.bd}` }}>-</button>
        <button onClick={() => setZoom(1)} className="px-1.5 py-0.5 rounded text-xs" style={{ background: C.cd, color: C.dm, border: `1px solid ${C.bd}` }}>1:1</button>
        <button onClick={() => setShowProfile(true)} className="px-2 py-0.5 rounded text-xs" style={{ background: C.cd, color: C.ac, border: `1px solid ${C.bd}` }}>Perfil p(z)</button>
      </div>

      <div className="overflow-auto" style={{ maxHeight: 400 }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 360 * zoom, transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
          <defs>
            <marker id="ap" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="5" markerHeight="4" orient="auto"><polygon points="0 0,8 3,0 6" fill={C.pos} /></marker>
            <marker id="an" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="5" markerHeight="4" orient="auto"><polygon points="0 0,8 3,0 6" fill={C.neg} /></marker>
            <marker id="ar" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="6" markerHeight="5" orient="auto"><polygon points="0 0,8 3,0 6" fill="#f97316" /></marker>
            <pattern id="gh" width="8" height="8" patternUnits="userSpaceOnUse"><line x1="0" y1="8" x2="8" y2="0" stroke={C.bd} strokeWidth={0.5} /></pattern>
          </defs>

          <rect x={m - 10} y={base + 1} width={W - m * 2 + 20} height={8} fill="url(#gh)" />
          <line x1={m - 10} y1={base} x2={W - m + 10} y2={base} stroke={C.bd} strokeWidth={2} />

          {/* 1 agua: columna izq he, columna der hc, faldón inclinado */}
          <line x1={lx} y1={base} x2={lx} y2={base - we} stroke={C.tx} strokeWidth={3} />
          <line x1={rx} y1={base} x2={rx} y2={base - wc} stroke={C.tx} strokeWidth={3} />
          <line x1={lx} y1={base - we} x2={rx} y2={base - wc} stroke={C.tx} strokeWidth={3} />

          {/* Dimensions */}
          <g>
            <line x1={lx} y1={base + 16} x2={rx} y2={base + 16} stroke={C.dm} strokeWidth={0.7} />
            <line x1={lx} y1={base + 12} x2={lx} y2={base + 20} stroke={C.dm} strokeWidth={0.7} />
            <line x1={rx} y1={base + 12} x2={rx} y2={base + 20} stroke={C.dm} strokeWidth={0.7} />
            <text x={(lx + rx) / 2} y={base + 28} fill={C.dm} fontSize={10} fontFamily="monospace" textAnchor="middle">B = {r.B} m</text>
          </g>
          <g>
            <line x1={lx - 18} y1={base} x2={lx - 18} y2={base - we} stroke={C.dm} strokeWidth={0.7} />
            <text x={lx - 22} y={base - we / 2 + 3} fill={C.dm} fontSize={8} fontFamily="monospace" textAnchor="end">he={r.he}m</text>
          </g>
          <g>
            <line x1={rx + 18} y1={base} x2={rx + 18} y2={base - wc} stroke={C.dm} strokeWidth={0.7} />
            <text x={rx + 22} y={base - wc / 2 + 3} fill={C.dm} fontSize={8} fontFamily="monospace" textAnchor="start">hc={r.hc}m</text>
          </g>
          {r.theta > 1 && <text x={(lx + rx) / 2 + 10} y={base - we + 14} fill={C.w} fontSize={10} fontFamily="monospace" fontWeight="bold">θ={r.theta.toFixed(1)}°</text>}

          {/* Distributed loads (kN/m) */}
          {drawDistLoad(lx, base, lx, base - we, ff.w_ww_max, 'l')}
          {drawDistLoad(rx, base, rx, base - wc, ff.w_lw_min, 'r')}
          {drawDistLoad(lx, base - we, rx, base - wc, ff.w_rbv_min, 'l')}

          {/* Supports */}
          {drawSupport(lx, base, ff.isEmp ? 'Empotrado' : 'Articulado')}
          {drawSupport(rx, base, ff.isEmp ? 'Empotrado' : 'Articulado')}

          {/* Reactions */}
          {drawReaction(lx, base + 12, ff.Rx_bv, 'h', `Rx=${Math.abs(ff.Rx_bv).toFixed(1)}kN`)}
          {drawReaction(lx - 12, base, ff.Ry_bv, 'v', `Ry=${Math.abs(ff.Ry_bv).toFixed(1)}kN`)}
          {ff.isEmp && <text x={lx + 12} y={base - 5} fill="#f97316" fontSize={8} fontFamily="monospace">M={Math.abs(ff.M_bv).toFixed(1)}kN·m</text>}

          {/* Wind indicator */}
          {isParallel ? (
            <g transform={`translate(${m},${base - we / 2})`}>
              <circle cx={-15} cy={0} r={9} fill="none" stroke={C.ac} strokeWidth={1.5} />
              <circle cx={-15} cy={0} r={2} fill={C.ac} />
              <text x={-15} y={-15} fill={C.ac} fontSize={9} fontFamily="monospace" textAnchor="middle">{r.windAngle}° ||</text>
            </g>
          ) : (
            <g transform={`translate(${m + 2},${base - we / 2})`}>
              {[-8, 0, 8].map(dy => <line key={dy} x1={-28} y1={dy} x2={-8} y2={dy} stroke={C.ac} strokeWidth={dy === 0 ? 2.5 : 1} opacity={dy === 0 ? 1 : 0.4} />)}
              <polygon points="-8,-4 0,0 -8,4" fill={C.ac} />
              <text x={-28} y={-15} fill={C.ac} fontSize={9} fontFamily="monospace" fontWeight="bold">{r.windAngle}°</text>
            </g>
          )}

          {/* Legend */}
          <g transform={`translate(${W - 120},8)`}>
            <rect x={0} y={0} width={110} height={54} rx={3} fill={C.cd} stroke={C.bd} strokeWidth={0.5} />
            <line x1={6} y1={13} x2={20} y2={13} stroke={C.pos} strokeWidth={1.5} /><text x={24} y={16} fill={C.tx} fontSize={8}>Presion (+) kN/m</text>
            <line x1={6} y1={26} x2={20} y2={26} stroke={C.neg} strokeWidth={1.5} /><text x={24} y={29} fill={C.tx} fontSize={8}>Succion (-) kN/m</text>
            <line x1={6} y1={39} x2={20} y2={39} stroke="#f97316" strokeWidth={1.5} /><text x={24} y={42} fill={C.tx} fontSize={8}>Reacciones kN</text>
          </g>

          <text x={W / 2} y={14} fill={C.dm} fontSize={10} fontFamily="monospace" textAnchor="middle">
            Portico Tipico — 1 Agua — {ff.isEmp ? 'Empotrado' : 'Articulado'} — Sep.={ff.sep.toFixed(2)}m
          </text>
        </svg>
      </div>
    </div>
  );
}
