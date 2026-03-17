/**
 * ui/views/ZoneDiagram.jsx — Diagramas SVG de zonas C&R
 * Según CIRSOC 102-2025 Fig. 5.3-1 (paredes) y Fig. 5.3-2 (techos)
 *
 * Zonas 2025: Z5 en paredes es L-shaped (franjas verticales + franja superior)
 *             Z2 y Z3 en techos con geometría L-shaped en bordes y esquinas
 */

import { useRef, useState } from 'react';
import { C } from '../common/theme.js';

const ZONE_COLORS = {
  1: '#3b82f6', // blue  — cubierta interior
  2: '#f59e0b', // amber — cubierta borde (L-shaped)
  3: '#ef4444', // red   — cubierta esquina
  4: '#3b82f6', // blue  — pared general
  5: '#f59e0b', // amber — pared borde (L-shaped)
};

const fmtP = (v) => (v >= 0 ? '+' : '') + v.toFixed(2);

/**
 * Diagrama de zonas de pared — ELEVACIÓN (Fig. 5.3-1)
 * Vista en elevación (frente de la pared):
 *   eje X = ancho de la pared (B)
 *   eje Y = altura H (de terreno a alero)
 * Zona 5 (borde, L-shaped): franja vertical izq (a × H)
 *                          + franja vertical der (a × H)
 *                          + franja horizontal superior (ancho completo, alto a)
 * Zona 4 (general): campo interior restante
 */
export function WallZoneDiagram({ B, L, a, h, he, pressures }) {
  const wallW = B || 10;
  const wallH = he || h || 6;

  const W = 360, H = 260, pad = 44;
  const availW = W - 2 * pad, availH = H - 2 * pad;
  const scale = Math.min(availW / wallW, availH / wallH);
  const bw = wallW * scale, hw = wallH * scale;
  const ox = (W - bw) / 2, oy = (H - hw) / 2;
  const aw = Math.min(a * scale, bw / 2);
  const ah = Math.min(a * scale, hw / 2);

  const z5 = ZONE_COLORS[5], z4 = ZONE_COLORS[4];

  return (
    <svg width={W} height={H} style={{ background: C.cd, borderRadius: 6 }}>
      <defs>
        <marker id="arrowCRw" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.ac} />
        </marker>
      </defs>

      {/* Zone 4 — interior (fondo completo) */}
      <rect x={ox} y={oy} width={bw} height={hw} fill={z4 + '18'} stroke="none" />

      {/* Zone 5 — L-shaped bordes
          Franja izquierda: x=ox, y=oy, w=aw, h=hw
          Franja derecha:   x=ox+bw-aw, y=oy, w=aw, h=hw
          Franja superior:  x=ox+aw, y=oy, w=bw-2*aw, h=ah
      */}
      <rect x={ox} y={oy} width={aw} height={hw} fill={z5 + '35'} stroke="none" />
      <rect x={ox + bw - aw} y={oy} width={aw} height={hw} fill={z5 + '35'} stroke="none" />
      <rect x={ox + aw} y={oy} width={Math.max(0, bw - 2 * aw)} height={ah} fill={z5 + '35'} stroke="none" />

      {/* Líneas interiores de zona 5 */}
      <line x1={ox + aw} y1={oy} x2={ox + aw} y2={oy + hw} stroke={z5} strokeWidth={0.7} strokeDasharray="3,2" />
      <line x1={ox + bw - aw} y1={oy} x2={ox + bw - aw} y2={oy + hw} stroke={z5} strokeWidth={0.7} strokeDasharray="3,2" />
      <line x1={ox + aw} y1={oy + ah} x2={ox + bw - aw} y2={oy + ah} stroke={z5} strokeWidth={0.7} strokeDasharray="3,2" />

      {/* Labels de zona */}
      <text x={ox + bw / 2} y={oy + ah + (hw - ah) / 2 + 4} textAnchor="middle" dominantBaseline="middle" fill={z4} fontSize={14} fontWeight="bold">Z4</text>
      <text x={ox + aw / 2} y={oy + hw / 2 + 4} textAnchor="middle" fill={z5} fontSize={11} fontWeight="bold">Z5</text>
      <text x={ox + bw - aw / 2} y={oy + hw / 2 + 4} textAnchor="middle" fill={z5} fontSize={11} fontWeight="bold">Z5</text>
      <text x={ox + bw / 2} y={oy + ah / 2 + 4} textAnchor="middle" fill={z5} fontSize={9} fontWeight="bold">Z5</text>

      {/* Contorno de la pared */}
      <rect x={ox} y={oy} width={bw} height={hw} fill="none" stroke={C.tx} strokeWidth={1.5} />

      {/* Línea de terreno */}
      <line x1={ox - 8} y1={oy + hw} x2={ox + bw + 8} y2={oy + hw} stroke={C.dm} strokeWidth={1.2} />
      <line x1={ox - 6} y1={oy + hw + 3} x2={ox + bw + 6} y2={oy + hw + 3} stroke={C.dm} strokeWidth={0.5} strokeDasharray="2,2" />

      {/* Acotación B (ancho) — abajo */}
      <line x1={ox} y1={oy + hw + 14} x2={ox + bw} y2={oy + hw + 14} stroke={C.dm} strokeWidth={0.6} />
      <line x1={ox} y1={oy + hw + 10} x2={ox} y2={oy + hw + 18} stroke={C.dm} strokeWidth={0.6} />
      <line x1={ox + bw} y1={oy + hw + 10} x2={ox + bw} y2={oy + hw + 18} stroke={C.dm} strokeWidth={0.6} />
      <text x={ox + bw / 2} y={oy + hw + 24} textAnchor="middle" fill={C.dm} fontSize={9}>B = {wallW}m</text>

      {/* Acotación H (altura) — derecha */}
      <line x1={ox + bw + 12} y1={oy} x2={ox + bw + 12} y2={oy + hw} stroke={C.dm} strokeWidth={0.6} />
      <line x1={ox + bw + 8} y1={oy} x2={ox + bw + 16} y2={oy} stroke={C.dm} strokeWidth={0.6} />
      <line x1={ox + bw + 8} y1={oy + hw} x2={ox + bw + 16} y2={oy + hw} stroke={C.dm} strokeWidth={0.6} />
      <text x={ox + bw + 16} y={oy + hw / 2 + 3} fill={C.dm} fontSize={9}>H = {wallH.toFixed(1)}m</text>

      {/* Acotación a — arriba izquierda */}
      <line x1={ox} y1={oy - 8} x2={ox + aw} y2={oy - 8} stroke={z5} strokeWidth={0.6} />
      <line x1={ox} y1={oy - 12} x2={ox} y2={oy - 4} stroke={z5} strokeWidth={0.6} />
      <line x1={ox + aw} y1={oy - 12} x2={ox + aw} y2={oy - 4} stroke={z5} strokeWidth={0.6} />
      <text x={ox + aw / 2} y={oy - 14} textAnchor="middle" fill={z5} fontSize={8}>a={a.toFixed(1)}m</text>

      {/* Referencia */}
      <text x={6} y={14} fill={C.dm} fontSize={8} fontStyle="italic">Fig. 5.3-1</text>

      {/* Flecha viento */}
      <line x1={ox - 24} y1={oy + hw / 2 - 12} x2={ox - 24} y2={oy + hw / 2 + 12} stroke={C.ac} strokeWidth={1.5} markerEnd="url(#arrowCRw)" />
      <text x={ox - 24} y={oy + hw / 2 - 16} textAnchor="middle" fill={C.ac} fontSize={7}>Viento</text>

      {/* Leyenda de presiones */}
      {pressures && Object.entries(pressures).map(([z, p], i) => (
        <text key={z} x={6} y={H - 6 - i * 13} fill={ZONE_COLORS[z]} fontSize={8} fontFamily="monospace">
          Z{z}: {fmtP(p.pPos)} / {fmtP(p.pNeg)} kN/m²
        </text>
      ))}
    </svg>
  );
}

/**
 * Diagrama de zonas de cubierta — PLANTA (Fig. 5.3-2)
 * Zona 3 (esquina): cuadrados a×a en las 4 esquinas
 * Zona 2 (borde, L-shaped): franjas ancho a en todo el perímetro, excluyendo Z3
 * Zona 1 (interior): campo central restante
 */
export function RoofZoneDiagram({ B, L, a, pressures }) {
  const W = 360, H = 260, pad = 44;
  const roofB = B || 10, roofL = L || 15;
  const availW = W - 2 * pad, availH = H - 2 * pad;
  const scale = Math.min(availW / roofB, availH / roofL);
  const bw = roofB * scale, lw = roofL * scale;
  const ox = (W - bw) / 2, oy = (H - lw) / 2;
  const aw = Math.min(a * scale, bw / 2);
  const ah = Math.min(a * scale, lw / 2);

  const z1 = ZONE_COLORS[1], z2 = ZONE_COLORS[2], z3 = ZONE_COLORS[3];

  return (
    <svg width={W} height={H} style={{ background: C.cd, borderRadius: 6 }}>
      <defs>
        <marker id="arrowCRr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.ac} />
        </marker>
      </defs>

      {/* Zone 1 — interior (fondo completo) */}
      <rect x={ox} y={oy} width={bw} height={lw} fill={z1 + '12'} stroke="none" />

      {/* Zone 2 — L-shaped bordes (excluyendo esquinas Z3)
          Borde sup central:  x=ox+aw, y=oy,        w=bw-2*aw, h=ah
          Borde inf central:  x=ox+aw, y=oy+lw-ah,  w=bw-2*aw, h=ah
          Borde izq central:  x=ox,    y=oy+ah,      w=aw,      h=lw-2*ah
          Borde der central:  x=ox+bw-aw, y=oy+ah,   w=aw,      h=lw-2*ah
      */}
      <rect x={ox + aw} y={oy} width={Math.max(0, bw - 2 * aw)} height={ah} fill={z2 + '28'} stroke="none" />
      <rect x={ox + aw} y={oy + lw - ah} width={Math.max(0, bw - 2 * aw)} height={ah} fill={z2 + '28'} stroke="none" />
      <rect x={ox} y={oy + ah} width={aw} height={Math.max(0, lw - 2 * ah)} fill={z2 + '28'} stroke="none" />
      <rect x={ox + bw - aw} y={oy + ah} width={aw} height={Math.max(0, lw - 2 * ah)} fill={z2 + '28'} stroke="none" />

      {/* Zone 3 — esquinas a×a (4 esquinas) */}
      <rect x={ox} y={oy} width={aw} height={ah} fill={z3 + '35'} stroke="none" />
      <rect x={ox + bw - aw} y={oy} width={aw} height={ah} fill={z3 + '35'} stroke="none" />
      <rect x={ox} y={oy + lw - ah} width={aw} height={ah} fill={z3 + '35'} stroke="none" />
      <rect x={ox + bw - aw} y={oy + lw - ah} width={aw} height={ah} fill={z3 + '35'} stroke="none" />

      {/* Líneas interiores de zonas */}
      <line x1={ox} y1={oy + ah} x2={ox + bw} y2={oy + ah} stroke={z2} strokeWidth={0.7} strokeDasharray="3,2" />
      <line x1={ox} y1={oy + lw - ah} x2={ox + bw} y2={oy + lw - ah} stroke={z2} strokeWidth={0.7} strokeDasharray="3,2" />
      <line x1={ox + aw} y1={oy} x2={ox + aw} y2={oy + lw} stroke={z2} strokeWidth={0.7} strokeDasharray="3,2" />
      <line x1={ox + bw - aw} y1={oy} x2={ox + bw - aw} y2={oy + lw} stroke={z2} strokeWidth={0.7} strokeDasharray="3,2" />

      {/* Labels de zona */}
      <text x={ox + bw / 2} y={oy + lw / 2 + 4} textAnchor="middle" fill={z1} fontSize={14} fontWeight="bold">Z1</text>
      <text x={ox + bw / 2} y={oy + ah / 2 + 4} textAnchor="middle" fill={z2} fontSize={10} fontWeight="bold">Z2</text>
      <text x={ox + bw / 2} y={oy + lw - ah / 2 + 4} textAnchor="middle" fill={z2} fontSize={10} fontWeight="bold">Z2</text>
      <text x={ox + aw / 2} y={oy + lw / 2 + 4} textAnchor="middle" fill={z2} fontSize={9} fontWeight="bold">Z2</text>
      <text x={ox + bw - aw / 2} y={oy + lw / 2 + 4} textAnchor="middle" fill={z2} fontSize={9} fontWeight="bold">Z2</text>
      {/* Z3 labels en esquinas */}
      <text x={ox + aw / 2} y={oy + ah / 2 + 3} textAnchor="middle" fill={z3} fontSize={9} fontWeight="bold">Z3</text>
      <text x={ox + bw - aw / 2} y={oy + ah / 2 + 3} textAnchor="middle" fill={z3} fontSize={9} fontWeight="bold">Z3</text>
      <text x={ox + aw / 2} y={oy + lw - ah / 2 + 3} textAnchor="middle" fill={z3} fontSize={9} fontWeight="bold">Z3</text>
      <text x={ox + bw - aw / 2} y={oy + lw - ah / 2 + 3} textAnchor="middle" fill={z3} fontSize={9} fontWeight="bold">Z3</text>

      {/* Contorno */}
      <rect x={ox} y={oy} width={bw} height={lw} fill="none" stroke={C.tx} strokeWidth={1.5} />

      {/* Cumbrera */}
      <line x1={ox} y1={oy + lw / 2} x2={ox + bw} y2={oy + lw / 2} stroke={C.ac} strokeWidth={1} strokeDasharray="5,3" />
      <text x={ox + bw + 4} y={oy + lw / 2 + 3} fill={C.ac} fontSize={7}>cumbrera</text>

      {/* Acotación B — arriba */}
      <line x1={ox} y1={oy - 10} x2={ox + bw} y2={oy - 10} stroke={C.dm} strokeWidth={0.6} />
      <line x1={ox} y1={oy - 14} x2={ox} y2={oy - 6} stroke={C.dm} strokeWidth={0.6} />
      <line x1={ox + bw} y1={oy - 14} x2={ox + bw} y2={oy - 6} stroke={C.dm} strokeWidth={0.6} />
      <text x={ox + bw / 2} y={oy - 16} textAnchor="middle" fill={C.dm} fontSize={9}>B = {roofB}m</text>

      {/* Acotación L — izquierda */}
      <line x1={ox - 10} y1={oy} x2={ox - 10} y2={oy + lw} stroke={C.dm} strokeWidth={0.6} />
      <line x1={ox - 14} y1={oy} x2={ox - 6} y2={oy} stroke={C.dm} strokeWidth={0.6} />
      <line x1={ox - 14} y1={oy + lw} x2={ox - 6} y2={oy + lw} stroke={C.dm} strokeWidth={0.6} />
      <text x={ox - 14} y={oy + lw / 2 + 3} textAnchor="middle" fill={C.dm} fontSize={9} transform={`rotate(-90, ${ox - 14}, ${oy + lw / 2})`}>L = {roofL}m</text>

      {/* Acotación a — abajo izquierda (horizontal) */}
      <line x1={ox} y1={oy + lw + 10} x2={ox + aw} y2={oy + lw + 10} stroke={z3} strokeWidth={0.6} />
      <line x1={ox} y1={oy + lw + 6} x2={ox} y2={oy + lw + 14} stroke={z3} strokeWidth={0.6} />
      <line x1={ox + aw} y1={oy + lw + 6} x2={ox + aw} y2={oy + lw + 14} stroke={z3} strokeWidth={0.6} />
      <text x={ox + aw / 2} y={oy + lw + 22} textAnchor="middle" fill={z3} fontSize={8}>a={a.toFixed(1)}m</text>

      {/* Acotación a — derecha (vertical) */}
      <line x1={ox + bw + 10} y1={oy} x2={ox + bw + 10} y2={oy + ah} stroke={z3} strokeWidth={0.6} />
      <line x1={ox + bw + 6} y1={oy} x2={ox + bw + 14} y2={oy} stroke={z3} strokeWidth={0.6} />
      <line x1={ox + bw + 6} y1={oy + ah} x2={ox + bw + 14} y2={oy + ah} stroke={z3} strokeWidth={0.6} />
      <text x={ox + bw + 20} y={oy + ah / 2 + 3} fill={z3} fontSize={8}>a</text>

      {/* Referencia */}
      <text x={6} y={14} fill={C.dm} fontSize={8} fontStyle="italic">Fig. 5.3-2</text>

      {/* Flecha viento */}
      <line x1={W - 16} y1={oy - 6} x2={W - 16} y2={oy + 18} stroke={C.ac} strokeWidth={1.5} markerEnd="url(#arrowCRr)" />
      <text x={W - 16} y={oy - 10} textAnchor="middle" fill={C.ac} fontSize={7}>Viento</text>

      {/* Leyenda de presiones */}
      {pressures && Object.entries(pressures).map(([z, p], i) => (
        <text key={z} x={6} y={H - 6 - i * 13} fill={ZONE_COLORS[z]} fontSize={8} fontFamily="monospace">
          Z{z}: {fmtP(p.pPos)} / {fmtP(p.pNeg)} kN/m²
        </text>
      ))}
    </svg>
  );
}

/**
 * Vista isométrica 3D de zonas C&R para PAREDES
 * Muestra las 4 paredes del edificio con Z4 (interior) y Z5 (bordes L-shaped)
 */
export function WallZone3D({ B, L, a, h, he }) {
  const [rY, srY] = useState(35);
  const [rX, srX] = useState(20);
  const [zoom, setZoom] = useState(1);
  const dr = useRef(false);
  const lp2 = useRef({ x: 0, y: 0 });

  const VW = 400, VH = 280, sc = 8 * zoom;
  const cy2 = Math.cos(rX * Math.PI / 180), sy2 = Math.sin(rX * Math.PI / 180);
  const cz2 = Math.cos(rY * Math.PI / 180), sz2 = Math.sin(rY * Math.PI / 180);
  const pr = (x, y, z) => {
    const rx = x * cz2 - z * sz2, rz = x * sz2 + z * cz2;
    return { x: VW / 2 + rx * sc, y: VH / 2 - (y * cy2 - rz * sy2) * sc };
  };
  const pl = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('') + 'Z';

  const bh = (B || 10) / 2, lh = (L || 15) / 2;
  const wallH = he || h || 6;
  const aVal = Math.min(a || 1, bh, lh, wallH);
  const z4c = ZONE_COLORS[4], z5c = ZONE_COLORS[5];

  // 4 wall faces
  const walls = [
    { pts: [pr(-bh, 0, -lh), pr(bh, 0, -lh), pr(bh, wallH, -lh), pr(-bh, wallH, -lh)], label: 'Frente' },
    { pts: [pr(-bh, 0, lh), pr(bh, 0, lh), pr(bh, wallH, lh), pr(-bh, wallH, lh)], label: 'Fondo' },
    { pts: [pr(-bh, 0, -lh), pr(-bh, 0, lh), pr(-bh, wallH, lh), pr(-bh, wallH, -lh)], label: 'Izq' },
    { pts: [pr(bh, 0, -lh), pr(bh, 0, lh), pr(bh, wallH, lh), pr(bh, wallH, -lh)], label: 'Der' },
  ];

  // Z5 L-shaped border strips (3 per wall: left strip, right strip, top strip)
  const z5s = [];
  // Front (z=-lh)
  z5s.push([pr(-bh, 0, -lh), pr(-bh + aVal, 0, -lh), pr(-bh + aVal, wallH, -lh), pr(-bh, wallH, -lh)]);
  z5s.push([pr(bh - aVal, 0, -lh), pr(bh, 0, -lh), pr(bh, wallH, -lh), pr(bh - aVal, wallH, -lh)]);
  z5s.push([pr(-bh + aVal, wallH - aVal, -lh), pr(bh - aVal, wallH - aVal, -lh), pr(bh - aVal, wallH, -lh), pr(-bh + aVal, wallH, -lh)]);
  // Back (z=lh)
  z5s.push([pr(-bh, 0, lh), pr(-bh + aVal, 0, lh), pr(-bh + aVal, wallH, lh), pr(-bh, wallH, lh)]);
  z5s.push([pr(bh - aVal, 0, lh), pr(bh, 0, lh), pr(bh, wallH, lh), pr(bh - aVal, wallH, lh)]);
  z5s.push([pr(-bh + aVal, wallH - aVal, lh), pr(bh - aVal, wallH - aVal, lh), pr(bh - aVal, wallH, lh), pr(-bh + aVal, wallH, lh)]);
  // Left (x=-bh)
  z5s.push([pr(-bh, 0, -lh), pr(-bh, 0, -lh + aVal), pr(-bh, wallH, -lh + aVal), pr(-bh, wallH, -lh)]);
  z5s.push([pr(-bh, 0, lh - aVal), pr(-bh, 0, lh), pr(-bh, wallH, lh), pr(-bh, wallH, lh - aVal)]);
  z5s.push([pr(-bh, wallH - aVal, -lh + aVal), pr(-bh, wallH - aVal, lh - aVal), pr(-bh, wallH, lh - aVal), pr(-bh, wallH, -lh + aVal)]);
  // Right (x=bh)
  z5s.push([pr(bh, 0, -lh), pr(bh, 0, -lh + aVal), pr(bh, wallH, -lh + aVal), pr(bh, wallH, -lh)]);
  z5s.push([pr(bh, 0, lh - aVal), pr(bh, 0, lh), pr(bh, wallH, lh), pr(bh, wallH, lh - aVal)]);
  z5s.push([pr(bh, wallH - aVal, -lh + aVal), pr(bh, wallH - aVal, lh - aVal), pr(bh, wallH, lh - aVal), pr(bh, wallH, -lh + aVal)]);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full cursor-grab active:cursor-grabbing" style={{ maxHeight: 280, background: C.cd, borderRadius: 6 }}
      onWheel={e => { e.preventDefault(); setZoom(z => Math.max(0.4, Math.min(2.5, z + (e.deltaY > 0 ? -0.05 : 0.05)))); }}
      onMouseDown={e => { dr.current = true; lp2.current = { x: e.clientX, y: e.clientY }; }}
      onMouseMove={e => { if (!dr.current) return; srY(p => p + (e.clientX - lp2.current.x) * .5); srX(p => Math.max(-60, Math.min(60, p - (e.clientY - lp2.current.y) * .5))); lp2.current = { x: e.clientX, y: e.clientY }; }}
      onMouseUp={() => dr.current = false}
      onMouseLeave={() => dr.current = false}
      onTouchStart={e => { if (e.touches.length === 1) { dr.current = true; lp2.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }}
      onTouchMove={e => { if (!dr.current || e.touches.length !== 1) return; srY(p => p + (e.touches[0].clientX - lp2.current.x) * .5); srX(p => Math.max(-60, Math.min(60, p - (e.touches[0].clientY - lp2.current.y) * .5))); lp2.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={() => dr.current = false}>

      {/* Grid */}
      {Array.from({ length: 9 }, (_, i) => { const t = -20 + i * 5; const ga = pr(t, 0, -20), gb = pr(t, 0, 20); return <line key={`x${i}`} x1={ga.x} y1={ga.y} x2={gb.x} y2={gb.y} stroke={C.bd} strokeWidth={.3} opacity={.3} />; })}
      {Array.from({ length: 9 }, (_, i) => { const t = -20 + i * 5; const ga = pr(-20, 0, t), gb = pr(20, 0, t); return <line key={`z${i}`} x1={ga.x} y1={ga.y} x2={gb.x} y2={gb.y} stroke={C.bd} strokeWidth={.3} opacity={.3} />; })}

      {/* Z4 wall fills */}
      {walls.map((w, i) => (
        <path key={`w${i}`} d={pl(w.pts)} fill={z4c + '18'} stroke={C.tx} strokeWidth={0.8} strokeLinejoin="round" opacity={0.85} />
      ))}

      {/* Z5 border strips */}
      {z5s.map((pts, i) => (
        <path key={`z5-${i}`} d={pl(pts)} fill={z5c + '40'} stroke={z5c} strokeWidth={0.4} strokeLinejoin="round" opacity={0.8} />
      ))}

      {/* Wall labels */}
      {walls.map((w, i) => {
        const cx = w.pts.reduce((s2, p) => s2 + p.x, 0) / 4;
        const cy3 = w.pts.reduce((s2, p) => s2 + p.y, 0) / 4;
        return (
          <g key={`lb${i}`}>
            <rect x={cx - 22} y={cy3 - 8} width={44} height={16} rx={2} fill="rgba(0,0,0,0.8)" stroke={C.bd} strokeWidth={0.5} />
            <text x={cx} y={cy3 + 3} fill={C.dm} fontSize={8} textAnchor="middle" fontFamily="monospace">{w.label}</text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={4} y={VH - 34} width={80} height={30} rx={3} fill="rgba(0,0,0,0.7)" stroke={C.bd} strokeWidth={0.5} />
      <rect x={8} y={VH - 28} width={8} height={8} fill={z4c + '30'} stroke={z4c} strokeWidth={0.5} />
      <text x={20} y={VH - 21} fill={z4c} fontSize={7} fontFamily="monospace">Z4 Interior</text>
      <rect x={8} y={VH - 16} width={8} height={8} fill={z5c + '50'} stroke={z5c} strokeWidth={0.5} />
      <text x={20} y={VH - 9} fill={z5c} fontSize={7} fontFamily="monospace">Z5 Borde</text>

      <text x={VW - 6} y={VH - 4} fill={C.dm} fontSize={6} textAnchor="end" fontFamily="monospace">Rotar: arrastrar | Zoom: scroll</text>
      <text x={6} y={12} fill={C.dm} fontSize={8} fontStyle="italic">Fig. 5.3-1 — Zonas C&R Paredes (3D)</text>
    </svg>
  );
}
