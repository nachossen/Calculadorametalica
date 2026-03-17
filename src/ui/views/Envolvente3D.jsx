/**
 * ui/views/Envolvente3D.jsx — Vista isométrica 3D para Método Envolvente
 * Muestra zonas coloreadas por presión GCpf según el caso seleccionado.
 */

import { useRef, useState } from 'react';
import { C } from '../common/theme.js';
import { ZONE_DESC } from '../../data/envolventeGCpf.js';

/** Zone color by GCpf sign: positive=red, negative=blue, scaled by magnitude */
const zc = (gcpf, alpha = 0.5) => {
  if (gcpf == null) return 'rgba(100,100,100,0.15)';
  const a = 0.15 + Math.min(Math.abs(gcpf) / 1.2, 1) * alpha;
  return gcpf >= 0
    ? `rgba(239,68,68,${a.toFixed(2)})`
    : `rgba(59,130,246,${a.toFixed(2)})`;
};

/**
 * @param {{ envR: Object, inp: Object, caso: number }} props
 * caso: 1-4 (Transversal, Longitudinal, Torsional Trans, Torsional Long)
 */
export function Envolvente3D({ envR, inp, caso = 1 }) {
  const [rY, srY] = useState(35);
  const [rX, srX] = useState(20);
  const [zoom, setZoom] = useState(1);
  const dr = useRef(false);
  const lp = useRef({ x: 0, y: 0 });

  if (!envR || !envR.isApplicable) return null;

  const { B, L, he, hc } = inp;
  const W = 480, H = 340, sc = 9 * zoom;
  const cy2 = Math.cos(rX * Math.PI / 180), sy2 = Math.sin(rX * Math.PI / 180);
  const cz2 = Math.cos(rY * Math.PI / 180), sz2 = Math.sin(rY * Math.PI / 180);
  const pr = (x, y, z) => {
    const rx = x * cz2 - z * sz2, rz = x * sz2 + z * cz2;
    return { x: W / 2 + rx * sc, y: H / 2 - (y * cy2 - rz * sy2) * sc };
  };
  const pl = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('') + 'Z';

  const bh = B / 2, lh = L / 2;
  const ro = inp.ro || 0;
  const a = envR.a;

  // Building vertices
  const v = {
    flb: pr(-bh, 0, -lh), frb: pr(bh, 0, -lh),
    blb: pr(-bh, 0, lh), brb: pr(bh, 0, lh),
    fle: pr(-bh, he, -lh), fre: pr(bh, he, -lh),
    ble: pr(-bh, he, lh), bre: pr(bh, he, lh),
    fr: pr(ro, hc, -lh), br: pr(ro, hc, lh),
  };

  // Get zone data for current case
  const cd = caso === 1 ? envR.c1 : caso === 2 ? envR.c2 : caso === 3 ? envR.c3 : envR.c4;

  // Build faces depending on case
  let faces = [];

  if (caso === 1) {
    // Transversal: zones 1(BV wall), 2(BV roof), 3(SV roof), 4(SV wall)
    // Plus 1E/2E/3E/4E at ends (width 'a' from each end)
    const eZ = Math.min(a, L); // end zone depth along Z
    const zF = -lh, zB = lh;
    const zFE = -lh + eZ, zBE = lh - eZ;

    // Zone 1E — front wall, ends
    faces.push({ pts: [pr(-bh, 0, zF), pr(bh, 0, zF), pr(bh, he, zF), pr(ro, hc, zF), pr(-bh, he, zF)], z: '1E', d: cd['1E'] });
    // Zone 1 — front wall, middle (if building long enough)
    if (L > 2 * eZ) {
      faces.push({ pts: [pr(-bh, 0, zFE), pr(bh, 0, zFE), pr(bh, he, zFE), pr(ro, hc, zFE), pr(-bh, he, zFE)], z: '1', d: cd['1'], opacity: 0.6 });
    }

    // Zone 4E — back wall, ends
    faces.push({ pts: [pr(-bh, 0, zB), pr(bh, 0, zB), pr(bh, he, zB), pr(ro, hc, zB), pr(-bh, he, zB)], z: '4E', d: cd['4E'] });
    if (L > 2 * eZ) {
      faces.push({ pts: [pr(-bh, 0, zBE), pr(bh, 0, zBE), pr(bh, he, zBE), pr(ro, hc, zBE), pr(-bh, he, zBE)], z: '4', d: cd['4'], opacity: 0.6 });
    }

    // Side walls — these are technically under zone 1/4 in transversal, simplified
    faces.push({ pts: [v.flb, v.blb, v.ble, v.fle], z: '1', d: cd['1'], opacity: 0.3 });
    faces.push({ pts: [v.frb, v.brb, v.bre, v.fre], z: '4', d: cd['4'], opacity: 0.3 });

    // Roof zones — Zone 2 (BV roof), Zone 3 (SV roof)
    faces.push({ pts: [v.fle, v.ble, v.br, v.fr], z: '2', d: cd['2'] });
    faces.push({ pts: [v.fre, v.bre, v.br, v.fr], z: '3', d: cd['3'] });

  } else if (caso === 2) {
    // Longitudinal: zones 1-6, 1E-6E
    // Zone 5 = front wall (BV), Zone 6 = back wall (SV)
    faces.push({ pts: [v.flb, v.frb, v.fre, v.fr, v.fle], z: '5', d: cd['5'] });
    faces.push({ pts: [v.blb, v.brb, v.bre, v.br, v.ble], z: '6', d: cd['6'] });

    // Zone 1 = left wall, Zone 4 = right wall
    faces.push({ pts: [v.flb, v.blb, v.ble, v.fle], z: '1', d: cd['1'] });
    faces.push({ pts: [v.frb, v.brb, v.bre, v.fre], z: '4', d: cd['4'] });

    // Roof: Zone 2 (BV), Zone 3 (SV)
    faces.push({ pts: [v.fle, v.ble, v.br, v.fr], z: '2', d: cd['2'] });
    faces.push({ pts: [v.fre, v.bre, v.br, v.fr], z: '3', d: cd['3'] });

  } else if (caso === 3) {
    // Torsional transversal: zones 1T-4T (half-building torsion)
    const midZ = 0;
    // 1T — front half of BV wall
    faces.push({ pts: [v.flb, v.frb, v.fre, v.fr, v.fle], z: '1T', d: cd['1T'] });
    // 4T — back wall
    faces.push({ pts: [v.blb, v.brb, v.bre, v.br, v.ble], z: '4T', d: cd['4T'] });
    // Side walls shaded lightly
    faces.push({ pts: [v.flb, v.blb, v.ble, v.fle], z: '1T', d: cd['1T'], opacity: 0.3 });
    faces.push({ pts: [v.frb, v.brb, v.bre, v.fre], z: '4T', d: cd['4T'], opacity: 0.3 });
    // Roof
    faces.push({ pts: [v.fle, v.ble, v.br, v.fr], z: '2T', d: cd['2T'] });
    faces.push({ pts: [v.fre, v.bre, v.br, v.fr], z: '3T', d: cd['3T'] });

  } else {
    // Case 4: Torsional longitudinal: zones 5T, 6T
    faces.push({ pts: [v.flb, v.frb, v.fre, v.fr, v.fle], z: '5T', d: cd['5T'] });
    faces.push({ pts: [v.blb, v.brb, v.bre, v.br, v.ble], z: '6T', d: cd['6T'] });
    faces.push({ pts: [v.flb, v.blb, v.ble, v.fle], z: '5T', d: cd['5T'], opacity: 0.3 });
    faces.push({ pts: [v.frb, v.brb, v.bre, v.fre], z: '6T', d: cd['6T'], opacity: 0.3 });
    faces.push({ pts: [v.fle, v.ble, v.br, v.fr], z: '5T', d: cd['5T'], opacity: 0.4 });
    faces.push({ pts: [v.fre, v.bre, v.br, v.fr], z: '6T', d: cd['6T'], opacity: 0.4 });
  }

  // Legend: unique zones in this case
  const uniqueZones = [...new Set(faces.map(f => f.z))];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-grab active:cursor-grabbing" style={{ maxHeight: 340 }}
        onWheel={e => { e.preventDefault(); setZoom(z => Math.max(0.4, Math.min(2.5, z + (e.deltaY > 0 ? -0.05 : 0.05)))); }}
        onMouseDown={e => { dr.current = true; lp.current = { x: e.clientX, y: e.clientY }; }}
        onMouseMove={e => { if (!dr.current) return; srY(p => p + (e.clientX - lp.current.x) * .5); srX(p => Math.max(-60, Math.min(60, p - (e.clientY - lp.current.y) * .5))); lp.current = { x: e.clientX, y: e.clientY }; }}
        onMouseUp={() => dr.current = false}
        onMouseLeave={() => dr.current = false}
        onTouchStart={e => { if (e.touches.length === 1) { dr.current = true; lp.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }}
        onTouchMove={e => { if (!dr.current || e.touches.length !== 1) return; srY(p => p + (e.touches[0].clientX - lp.current.x) * .5); srX(p => Math.max(-60, Math.min(60, p - (e.touches[0].clientY - lp.current.y) * .5))); lp.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={() => dr.current = false}>

        {/* Grid */}
        {Array.from({ length: 9 }, (_, i) => { const t = -20 + i * 5; const a2 = pr(t, 0, -20), b2 = pr(t, 0, 20); return <line key={`x${i}`} x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke={C.bd} strokeWidth={.3} opacity={.3} />; })}
        {Array.from({ length: 9 }, (_, i) => { const t = -20 + i * 5; const a2 = pr(-20, 0, t), b2 = pr(20, 0, t); return <line key={`z${i}`} x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke={C.bd} strokeWidth={.3} opacity={.3} />; })}

        {/* Building outline — wireframe first */}
        <path d={pl([v.flb, v.frb, v.fre, v.fr, v.fle])} fill="none" stroke={C.bd} strokeWidth={0.5} />
        <path d={pl([v.blb, v.brb, v.bre, v.br, v.ble])} fill="none" stroke={C.bd} strokeWidth={0.5} />
        <path d={pl([v.flb, v.blb, v.ble, v.fle])} fill="none" stroke={C.bd} strokeWidth={0.5} />
        <path d={pl([v.frb, v.brb, v.bre, v.fre])} fill="none" stroke={C.bd} strokeWidth={0.5} />

        {/* Colored zone faces */}
        {faces.map((f, i) => (
          <path key={i} d={pl(f.pts)}
            fill={f.d ? zc(f.d.gcpf) : 'rgba(100,100,100,0.1)'}
            stroke={C.tx} strokeWidth={0.6} strokeLinejoin="round"
            opacity={f.opacity || 0.85} />
        ))}

        {/* Ridge line */}
        <line x1={v.fr.x} y1={v.fr.y} x2={v.br.x} y2={v.br.y} stroke={C.w} strokeWidth={1} strokeDasharray="4 2" />

        {/* Zone labels on main visible faces */}
        {faces.filter(f => (f.opacity || 0.85) > 0.5 && f.d).map((f, i) => {
          const cx = f.pts.reduce((s, p) => s + p.x, 0) / f.pts.length;
          const cy = f.pts.reduce((s, p) => s + p.y, 0) / f.pts.length;
          return (
            <g key={`lb${i}`}>
              <rect x={cx - 30} y={cy - 14} width={60} height={28} rx={2} fill="rgba(0,0,0,0.85)" stroke={C.bd} strokeWidth={0.5} />
              <text x={cx} y={cy - 4} fill={C.dm} fontSize={7} textAnchor="middle" fontFamily="monospace">Z{f.z}</text>
              <text x={cx} y={cy + 5} fill={f.d.gcpf >= 0 ? C.pos : C.neg} fontSize={7.5} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                {f.d.gcpf >= 0 ? '+' : ''}{f.d.gcpf.toFixed(2)}
              </text>
              <text x={cx} y={cy + 13} fill={C.dm} fontSize={6} textAnchor="middle" fontFamily="monospace">
                {f.d.pPos.toFixed(0)}/{f.d.pNeg.toFixed(0)} Pa
              </text>
            </g>
          );
        })}

        {/* Wind direction arrow */}
        {(() => {
          // Wind from front (caso 1,3) or side (caso 2,4)
          const fromSide = caso === 2 || caso === 4;
          const arrowStart = fromSide ? pr(-bh - 5, he / 2, 0) : pr(0, he / 2, -lh - 5);
          const arrowEnd   = fromSide ? pr(-bh - 1, he / 2, 0) : pr(0, he / 2, -lh - 1);
          const arrowMid   = fromSide ? pr(-bh - 3, he / 2 + 1.5, 0) : pr(0, he / 2 + 1.5, -lh - 3);
          return (
            <g>
              <line x1={arrowStart.x} y1={arrowStart.y} x2={arrowEnd.x} y2={arrowEnd.y}
                stroke={C.ac} strokeWidth={2} markerEnd="url(#windArrowEnv)" />
              <text x={arrowMid.x} y={arrowMid.y - 6} fill={C.ac} fontSize={8} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                VIENTO
              </text>
              <defs>
                <marker id="windArrowEnv" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L8,3 L0,6" fill={C.ac} />
                </marker>
              </defs>
            </g>
          );
        })()}

        <text x={W - 8} y={H - 5} fill={C.dm} fontSize={7} textAnchor="end" fontFamily="monospace">Rotar: arrastrar | Zoom: scroll</text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-3 py-2" style={{ borderTop: `1px solid ${C.bd}` }}>
        {uniqueZones.map(z => {
          const d = cd[z];
          if (!d) return null;
          return (
            <div key={z} className="flex items-center gap-1.5 text-xs" style={{ color: C.dm }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: zc(d.gcpf, 0.7), border: `1px solid ${C.bd}` }} />
              <span className="font-mono font-bold" style={{ color: C.tx }}>Z{z}</span>
              <span>{ZONE_DESC[z] || z}</span>
              <span className="font-mono" style={{ color: d.gcpf >= 0 ? C.pos : C.neg }}>
                {d.gcpf >= 0 ? '+' : ''}{d.gcpf.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
