/**
 * roofTypes/unaAgua/geometry3D.jsx — Vista isométrica 3D (1 agua)
 * Con zoom, touch y aberturas
 */

import { useRef, useState } from 'react';
import { C } from '../../ui/common/theme.js';

export function Render3D({ r }) {
  const [rY, srY] = useState(35);
  const [rX, srX] = useState(20);
  const [zoom3d, setZoom3d] = useState(1);
  const dr = useRef(false);
  const lp = useRef({ x: 0, y: 0 });

  const W = 480, H = 340, sc = 9 * zoom3d;
  const cy2 = Math.cos(rX * Math.PI / 180), sy2 = Math.sin(rX * Math.PI / 180);
  const cz2 = Math.cos(rY * Math.PI / 180), sz2 = Math.sin(rY * Math.PI / 180);
  const pr = (x, y, z) => { const rx = x * cz2 - z * sz2, rz = x * sz2 + z * cz2; return { x: W / 2 + rx * sc, y: H / 2 - (y * cy2 - rz * sy2) * sc }; };

  const bh = r.B / 2, lh = r.L / 2;
  const v = {
    flb: pr(-bh, 0, -lh), frb: pr(bh, 0, -lh), blb: pr(-bh, 0, lh), brb: pr(bh, 0, lh),
    fle: pr(-bh, r.he, -lh), fre: pr(bh, r.hc, -lh),
    ble: pr(-bh, r.he, lh), bre: pr(bh, r.hc, lh),
  };

  const pc = p => p > 0 ? `rgba(239,68,68,${.12 + Math.min(Math.abs(p) / 1500, 1) * .4})` : `rgba(59,130,246,${.12 + Math.min(Math.abs(p) / 1500, 1) * .4})`;
  const pl = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('') + 'Z';

  const faces = [
    { pts: [v.flb, v.frb, v.fre, v.fle], p: r.pWW.max, lb: 'BV' },
    { pts: [v.blb, v.brb, v.bre, v.ble], p: r.pLW.max, lb: 'SV' },
    { pts: [v.flb, v.blb, v.ble, v.fle], p: r.pLat.max, lb: 'Lat' },
    { pts: [v.frb, v.brb, v.bre, v.fre], p: r.pLat.min, lb: 'Lat' },
    { pts: [v.fle, v.ble, v.bre, v.fre], p: r.pRBVmax.max, lb: 'Cubierta' },
  ];

  const nP = r.porticos;
  const sep2 = nP > 1 ? r.L / (nP - 1) : 0;
  const frames = [];
  for (let i = 0; i < nP; i++) {
    const zz = -lh + i * sep2;
    frames.push({
      bl: pr(-bh, 0, zz), br: pr(bh, 0, zz),
      el: pr(-bh, r.he, zz), er: pr(bh, r.hc, zz),
    });
  }

  // Openings from inp
  const openings = r.openings || {};
  const openingRects = [];
  Object.entries(openings).forEach(([wallId, wallOpenings]) => {
    if (!Array.isArray(wallOpenings)) return;
    wallOpenings.forEach((op, oi) => {
      const ow = op.w || 2, oh2 = op.h || 2, oBottom = op.bottom || 0.5;
      let pts;
      if (wallId === 'BV' || wallId === 'front') {
        const fx = -bh + (op.x || bh) - ow / 2, fy = oBottom;
        pts = [pr(fx, fy, -lh), pr(fx + ow, fy, -lh), pr(fx + ow, fy + oh2, -lh), pr(fx, fy + oh2, -lh)];
      } else if (wallId === 'SV' || wallId === 'back') {
        const fx = -bh + (op.x || bh) - ow / 2, fy = oBottom;
        pts = [pr(fx, fy, lh), pr(fx + ow, fy, lh), pr(fx + ow, fy + oh2, lh), pr(fx, fy + oh2, lh)];
      } else if (wallId === 'left') {
        const fz = -lh + (op.x || lh) - ow / 2, fy = oBottom;
        pts = [pr(-bh, fy, fz), pr(-bh, fy, fz + ow), pr(-bh, fy + oh2, fz + ow), pr(-bh, fy + oh2, fz)];
      } else if (wallId === 'right') {
        const fz = -lh + (op.x || lh) - ow / 2, fy = oBottom;
        pts = [pr(bh, fy, fz), pr(bh, fy, fz + ow), pr(bh, fy + oh2, fz + ow), pr(bh, fy + oh2, fz)];
      }
      if (pts) openingRects.push({ key: `${wallId}-${oi}`, pts });
    });
  });

  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-grab active:cursor-grabbing" style={{ maxHeight: 320 }}
    onWheel={e => { e.preventDefault(); setZoom3d(z => Math.max(0.4, Math.min(2.5, z + (e.deltaY > 0 ? -0.05 : 0.05)))); }}
    onMouseDown={e => { dr.current = true; lp.current = { x: e.clientX, y: e.clientY }; }}
    onMouseMove={e => { if (!dr.current) return; srY(p => p + (e.clientX - lp.current.x) * .5); srX(p => Math.max(-60, Math.min(60, p - (e.clientY - lp.current.y) * .5))); lp.current = { x: e.clientX, y: e.clientY }; }}
    onMouseUp={() => dr.current = false}
    onMouseLeave={() => dr.current = false}
    onTouchStart={e => { if (e.touches.length === 1) { dr.current = true; lp.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }}
    onTouchMove={e => { if (!dr.current || e.touches.length !== 1) return; srY(p => p + (e.touches[0].clientX - lp.current.x) * .5); srX(p => Math.max(-60, Math.min(60, p - (e.touches[0].clientY - lp.current.y) * .5))); lp.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
    onTouchEnd={() => dr.current = false}>
    {Array.from({ length: 9 }, (_, i) => { const t = -20 + i * 5; const a = pr(t, 0, -20), b = pr(t, 0, 20); return <line key={`x${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.bd} strokeWidth={.3} opacity={.3} />; })}
    {Array.from({ length: 9 }, (_, i) => { const t = -20 + i * 5; const a = pr(-20, 0, t), b = pr(20, 0, t); return <line key={`z${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.bd} strokeWidth={.3} opacity={.3} />; })}
    {faces.map((f, i) => <path key={i} d={pl(f.pts)} fill={pc(f.p)} stroke={C.tx} strokeWidth={.8} strokeLinejoin="round" opacity={.85} />)}
    {openingRects.map(o => <path key={o.key} d={pl(o.pts)} fill="rgba(251,191,36,.35)" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" />)}
    {frames.map((f, i) => <g key={`fr${i}`}>
      <line x1={f.bl.x} y1={f.bl.y} x2={f.el.x} y2={f.el.y} stroke={C.w} strokeWidth={1.5} opacity={.6} />
      <line x1={f.br.x} y1={f.br.y} x2={f.er.x} y2={f.er.y} stroke={C.w} strokeWidth={1.5} opacity={.6} />
      <line x1={f.el.x} y1={f.el.y} x2={f.er.x} y2={f.er.y} stroke={C.w} strokeWidth={1.5} opacity={.6} />
    </g>)}
    {[
      { f: faces[0], lb: 'BV', mx: r.pWW.max, mn: r.pWW.min },
      { f: faces[1], lb: 'SV', mx: r.pLW.max, mn: r.pLW.min },
      { f: faces[4], lb: 'Cubierta', mx: r.pRBVmax.max, mn: r.pRBVmin.min },
    ].map((item, i) => {
      const cx = item.f.pts.reduce((s, p) => s + p.x, 0) / item.f.pts.length;
      const cy3 = item.f.pts.reduce((s, p) => s + p.y, 0) / item.f.pts.length;
      return <g key={`lb${i}`}>
        <rect x={cx - 32} y={cy3 - 14} width={64} height={28} rx={2} fill="rgba(0,0,0,.8)" stroke={C.bd} strokeWidth={.5} />
        <text x={cx} y={cy3 - 4} fill={C.dm} fontSize={7} textAnchor="middle" fontFamily="monospace">{item.lb}</text>
        <text x={cx} y={cy3 + 6} fill={item.mx > 0 ? C.pos : C.neg} fontSize={7} textAnchor="middle" fontFamily="monospace" fontWeight="bold">max:{item.mx > 0 ? '+' : ''}{item.mx.toFixed(0)}</text>
        <text x={cx} y={cy3 + 14} fill={item.mn > 0 ? C.pos : C.neg} fontSize={7} textAnchor="middle" fontFamily="monospace" fontWeight="bold">min:{item.mn > 0 ? '+' : ''}{item.mn.toFixed(0)}</text>
      </g>;
    })}
    {(() => {
      const rd = (r.windAngle - 90) * Math.PI / 180;
      const d = 16;
      const s2 = pr(Math.cos(rd) * d * 1.8, r.h / 2, Math.sin(rd) * d * 1.8);
      const e2 = pr(Math.cos(rd) * d * .5, r.h / 2, Math.sin(rd) * d * .5);
      return <g>
        <defs><marker id="w3u" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto"><polygon points="0 0,10 3.5,0 7" fill={C.ac} /></marker></defs>
        <line x1={s2.x} y1={s2.y} x2={e2.x} y2={e2.y} stroke={C.ac} strokeWidth={2.5} markerEnd="url(#w3u)" />
        <text x={s2.x} y={s2.y - 8} fill={C.ac} fontSize={9} textAnchor="middle" fontFamily="monospace" fontWeight="bold">Viento {r.windAngle}°</text>
      </g>;
    })()}
    <text x={W - 8} y={H - 5} fill={C.dm} fontSize={7} textAnchor="end" fontFamily="monospace">Arrastrá para rotar · Scroll para zoom</text>
  </svg>;
}
