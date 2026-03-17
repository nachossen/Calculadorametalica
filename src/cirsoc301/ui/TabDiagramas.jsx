/**
 * TabDiagramas.jsx — Diagramas técnicos de esfuerzos y deformada
 *
 * Mejoras respecto a versión anterior:
 *  - SVG responsivo (viewBox + width=100%)
 *  - Símbolos de apoyo empotrado / articulado en la base
 *  - Etiquetas con fondo y sin superposición (deduplicadas por nodo)
 *  - Tooltip al hover: muestra N, V, M (o ux, uy, θ en deformada) interpolados
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { C } from '../../ui/common/theme.js';
import {
  nodePositions,
  computarDiagramas,
  computarDeformada,
  autoScale,
  autoDeformScale,
  segmentsBySign,
} from '../core/diagramas.js';

// ─── Paleta ────────────────────────────────────────────────────────────────

const COL_POS  = '#ef4444';
const COL_NEG  = '#3b82f6';
const COL_AXIS = '#6b7280';
const COL_DEF  = '#f59e0b';
const COL_ORIG = '#374151';
const COL_REACT = '#4ade80';  // verde para reacciones

// Dimensiones lógicas del viewBox
const VB_W = 640;
const VB_H = 380;

// Conectividad del pórtico (nodo i → nodo j por elemento)
const CONN = [[0, 1], [1, 2], [2, 3], [3, 4]];

// ─── Transform mundo → SVG ────────────────────────────────────────────────

/**
 * Devuelve funciones de conversión mundo ↔ SVG (viewBox coords).
 * Expone offX/offY e inversas para hit-testing en hover.
 * Padding asimétrico: más espacio abajo para símbolos de apoyo.
 */
function makeTransform(geo, diagExt) {
  const { B, hc } = geo;
  const padL = 50, padR = 34, padT = 22, padB = 56;
  const availW = VB_W - padL - padR;
  const availH = VB_H - padT - padB;
  const worldW = B + 2 * diagExt;
  const worldH = hc + 2 * diagExt;
  const scale = Math.min(availW / worldW, availH / worldH);
  const offX = padL + (availW - worldW * scale) / 2 + diagExt * scale;
  const offY = padT + (availH - worldH * scale) / 2 + (hc + diagExt) * scale;
  return {
    scale, offX, offY,
    toSvgX:   wx => offX + wx * scale,
    toSvgY:   wy => offY - wy * scale,
    toSvgLen: l  => l * scale,
    toWorldX: sx => (sx - offX) / scale,
    toWorldY: sy => (offY - sy) / scale,
  };
}

// ─── Símbolos de apoyo ─────────────────────────────────────────────────────

/** Apoyo empotrado: placa rectangular + tramas diagonales */
function SupportFixed({ sx, sy, size = 15 }) {
  const w = size, h = Math.round(size * 0.55);
  const hatch = Math.round(size * 0.55);
  const n = Math.max(3, Math.round(size / 3));
  const xs = Array.from({ length: n }, (_, i) => sx - w + (i / (n - 1)) * w * 2);
  return (
    <g>
      <rect x={sx - w} y={sy} width={w * 2} height={h}
        fill="#2d3748" stroke={C.ac} strokeWidth={1} />
      {xs.map((x0, i) => (
        <line key={i} x1={x0} y1={sy + h} x2={x0 - size * 0.33} y2={sy + h + hatch}
          stroke={C.ac} strokeWidth={0.8} opacity={0.65} />
      ))}
      <line x1={sx - w - 2} y1={sy + h + hatch} x2={sx + w + 2} y2={sy + h + hatch}
        stroke={C.ac} strokeWidth={1} />
    </g>
  );
}

/** Apoyo articulado (rótula): triángulo + tramas en base */
function SupportPinned({ sx, sy, size = 12 }) {
  const w = size, h = Math.round(size * 1.25);
  const hatch = Math.round(size * 0.58);
  const n = Math.max(3, Math.round(size / 3.5));
  const xs = Array.from({ length: n }, (_, i) => sx - w + 3 + (i / (n - 1)) * (w * 2 - 6));
  return (
    <g>
      <polygon points={`${sx},${sy} ${sx - w},${sy + h} ${sx + w},${sy + h}`}
        fill="none" stroke={C.ac} strokeWidth={1.2} />
      {/* pequeño círculo en la rótula */}
      <circle cx={sx} cy={sy} r={Math.max(2, size * 0.17)} fill={C.ac} opacity={0.6} />
      <line x1={sx - w - 3} y1={sy + h} x2={sx + w + 3} y2={sy + h}
        stroke={C.ac} strokeWidth={1.5} />
      {xs.map((x0, i) => (
        <line key={i} x1={x0} y1={sy + h} x2={x0 - size * 0.33} y2={sy + h + hatch}
          stroke={C.ac} strokeWidth={0.8} opacity={0.65} />
      ))}
      <line x1={sx - w - 3} y1={sy + h + hatch} x2={sx + w + 3} y2={sy + h + hatch}
        stroke={C.ac} strokeWidth={1} />
    </g>
  );
}

// ─── SVG helpers ───────────────────────────────────────────────────────────

function pts2svg(pts, tx) {
  return pts.map(([x, y]) => `${tx.toSvgX(x).toFixed(1)},${tx.toSvgY(y).toFixed(1)}`).join(' ');
}

function FrameOutline({ geo, tx, stroke = COL_ORIG, sw = 1.5, dasharray }) {
  const nodes = nodePositions(geo);
  const d = nodes.map(([x, y], i) =>
    `${i === 0 ? 'M' : 'L'} ${tx.toSvgX(x).toFixed(1)},${tx.toSvgY(y).toFixed(1)}`
  ).join(' ');
  return <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dasharray} />;
}

function NodeDot({ x, y, tx, r = 3, fill = COL_AXIS }) {
  return <circle cx={tx.toSvgX(x)} cy={tx.toSvgY(y)} r={r} fill={fill} />;
}

/** Etiqueta SVG con fondo opaco para evitar superposición con el diagrama */
function LabelWithBg({ sx, sy, text, color, anchor = 'middle', dy = 0, fontSize = 10.5 }) {
  const charW = fontSize * 0.61;
  const approxW = text.length * charW + 5;
  const approxH = fontSize + 3;
  const xOff = anchor === 'middle' ? -approxW / 2
    : anchor === 'end' ? -approxW : 0;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={sx + xOff} y={sy + dy - approxH + 1}
        width={approxW} height={approxH}
        fill="#0f172a" opacity={0.82} rx={2} />
      <text x={sx} y={sy + dy}
        textAnchor={anchor} fontSize={fontSize}
        fontFamily="monospace" fill={color}
        style={{ userSelect: 'none' }}>
        {text}
      </text>
    </g>
  );
}

// ─── Hover helpers ─────────────────────────────────────────────────────────

const ELEM_NAMES = ['Col. izq', 'Raf. izq', 'Raf. der', 'Col. der'];

/**
 * Dado un punto en coords viewBox, proyecta sobre los ejes de los elementos
 * y devuelve el más cercano (dentro de tolerancia) con N, V, M interpolados.
 */
function findHoverInfo(svgX, svgY, tx, elems) {
  const wx = tx.toWorldX(svgX);
  const wy = tx.toWorldY(svgY);
  const TOL = 3.0; // metros

  let best = null, bestDist = TOL;
  for (let e = 0; e < elems.length; e++) {
    const el = elems[e];
    const dx = el.xj - el.xi, dy = el.yj - el.yi;
    const L2 = dx * dx + dy * dy;
    if (L2 < 1e-9) continue;
    const t = Math.max(0, Math.min(1, ((wx - el.xi) * dx + (wy - el.yi) * dy) / L2));
    const px = el.xi + t * dx, py = el.yi + t * dy;
    const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2);
    if (dist < bestDist) { bestDist = dist; best = { e, localX: t * el.L }; }
  }
  if (!best) return null;

  const el = elems[best.e];
  // Interpolación lineal entre muestras
  let k = 0;
  for (let i = 0; i < el.xs.length - 1; i++) {
    if (el.xs[i] <= best.localX) k = i;
  }
  const span = el.xs[k + 1] != null ? el.xs[k + 1] - el.xs[k] : 1;
  const dt = span > 1e-9 ? (best.localX - el.xs[k]) / span : 0;
  const lerp = (a, b) => a + dt * (b - a);
  const kk = Math.min(k + 1, el.xs.length - 1);
  const V = lerp(el.V[k], el.V[kk]);
  const M = lerp(el.M[k], el.M[kk]);
  const N = lerp(el.N[k], el.N[kk]);

  const c = Math.cos(el.theta), s = Math.sin(el.theta);
  return {
    elemIdx: best.e,
    localX: best.localX,
    V, M, N,
    svgX: tx.toSvgX(el.xi + best.localX * c),
    svgY: tx.toSvgY(el.yi + best.localX * s),
  };
}

/**
 * Hover para deformada: proyecta sobre eje sin deformar,
 * evalúa interpolación de Hermite en ese punto y devuelve desplazamientos reales.
 */
function findHoverDeform(svgX, svgY, tx, elems, comboResult) {
  const U = comboResult?.displacements;
  if (!U) return null;

  const wx = tx.toWorldX(svgX);
  const wy = tx.toWorldY(svgY);
  const TOL = 3.0;

  let best = null, bestDist = TOL;
  for (let e = 0; e < elems.length; e++) {
    const el = elems[e];
    const dx = el.xj - el.xi, dy = el.yj - el.yi;
    const L2 = dx * dx + dy * dy;
    if (L2 < 1e-9) continue;
    const t = Math.max(0, Math.min(1, ((wx - el.xi) * dx + (wy - el.yi) * dy) / L2));
    const px = el.xi + t * dx, py = el.yi + t * dy;
    const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2);
    if (dist < bestDist) { bestDist = dist; best = { e, t_norm: t }; }
  }
  if (!best) return null;

  const { e, t_norm } = best;
  const el = elems[e];
  const L = el.L;
  const [ni, nj] = CONN[e];
  const c = Math.cos(el.theta), s = Math.sin(el.theta);

  const uig = U[ni * 3], vig = U[ni * 3 + 1], thi_n = U[ni * 3 + 2];
  const ujg = U[nj * 3], vjg = U[nj * 3 + 1], thj_n = U[nj * 3 + 2];

  // Global → local
  const u_li =  c * uig + s * vig;
  const v_li = -s * uig + c * vig;
  const u_lj =  c * ujg + s * vjg;
  const v_lj = -s * ujg + c * vjg;

  const t2 = t_norm ** 2, t3 = t_norm ** 3;
  const H1 = 1 - 3 * t2 + 2 * t3;
  const H2 = L * (t_norm - 2 * t2 + t3);
  const H3 = 3 * t2 - 2 * t3;
  const H4 = L * (-t2 + t3);

  const u_loc = (1 - t_norm) * u_li + t_norm * u_lj;
  const v_loc = H1 * v_li + H2 * thi_n + H3 * v_lj + H4 * thj_n;

  // Local → global (actual displacement)
  const ux = c * u_loc - s * v_loc;
  const uy = s * u_loc + c * v_loc;

  // Rotation dv_loc/dx = (1/L) * dv_loc/dt_norm
  const dH1 = (-6 * t_norm + 6 * t2);
  const dH2 = L * (1 - 4 * t_norm + 3 * t2);
  const dH3 = (6 * t_norm - 6 * t2);
  const dH4 = L * (-2 * t_norm + 3 * t2);
  const theta_rad = (dH1 * v_li + dH2 * thi_n + dH3 * v_lj + dH4 * thj_n) / L;

  const pwx = el.xi + t_norm * L * c;
  const pwy = el.yi + t_norm * L * s;
  return {
    elemIdx: e,
    localX: t_norm * L,
    ux_mm: ux * 1000,
    uy_mm: uy * 1000,
    theta_mrad: theta_rad * 1000,
    svgX: tx.toSvgX(pwx),
    svgY: tx.toSvgY(pwy),
  };
}

// ─── Tooltip SVG ────────────────────────────────────────────────────────────

function HoverTooltip({ info, tipo }) {
  if (!info) return null;
  const { svgX, svgY, localX, elemIdx } = info;
  const name = ELEM_NAMES[elemIdx] ?? '—';

  const lines = tipo === 'def'
    ? [name, `x = ${localX.toFixed(2)} m`,
       `ux = ${info.ux_mm >= 0 ? '+' : ''}${info.ux_mm.toFixed(2)} mm`,
       `uy = ${info.uy_mm >= 0 ? '+' : ''}${info.uy_mm.toFixed(2)} mm`,
       `θ  = ${info.theta_mrad.toFixed(3)} mrad`]
    : [name, `x = ${localX.toFixed(2)} m`,
       `N = ${info.N >= 0 ? '+' : ''}${info.N.toFixed(1)} kN`,
       `V = ${info.V >= 0 ? '+' : ''}${info.V.toFixed(1)} kN`,
       `M = ${info.M >= 0 ? '+' : ''}${info.M.toFixed(1)} kN·m`];

  const fsz = 10.5, lineH = fsz + 4.5, padX = 7, padY = 5;
  const boxW = 148, boxH = lines.length * lineH + padY * 2;
  let bx = svgX + 14;
  let by = svgY - boxH - 10;
  if (bx + boxW > VB_W - 6) bx = svgX - boxW - 14;
  if (by < 4) by = svgY + 10;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Crosshair en el punto del elemento */}
      <line x1={svgX - 11} y1={svgY} x2={svgX + 11} y2={svgY}
        stroke="#f8fafc" strokeWidth={0.7} opacity={0.8} />
      <line x1={svgX} y1={svgY - 11} x2={svgX} y2={svgY + 11}
        stroke="#f8fafc" strokeWidth={0.7} opacity={0.8} />
      <circle cx={svgX} cy={svgY} r={3.5} fill="#f8fafc" stroke="#1e293b" strokeWidth={1} />
      {/* Caja */}
      <rect x={bx} y={by} width={boxW} height={boxH}
        fill="#1e293b" stroke={C.ac} strokeWidth={0.9} rx={3} opacity={0.97} />
      {lines.map((line, i) => (
        <text key={i}
          x={bx + padX} y={by + padY + (i + 0.78) * lineH}
          fontSize={fsz} fontFamily="monospace"
          fill={i === 0 ? C.ac : C.tx}
          style={{ userSelect: 'none' }}>
          {line}
        </text>
      ))}
    </g>
  );
}

// ─── Leyenda de escala ──────────────────────────────────────────────────────

function ScaleLegend({ tx, diagExt, maxAbs, unit }) {
  const barLen = Math.min(85, Math.max(40, tx.toSvgLen(diagExt)));
  const x0 = 8, y0 = 14;
  return (
    <g>
      <line x1={x0} y1={y0} x2={x0 + barLen} y2={y0}
        stroke={COL_POS} strokeWidth={1.5} />
      <line x1={x0}          y1={y0 - 4} x2={x0}          y2={y0 + 4} stroke={COL_POS} strokeWidth={1} />
      <line x1={x0 + barLen} y1={y0 - 4} x2={x0 + barLen} y2={y0 + 4} stroke={COL_POS} strokeWidth={1} />
      <text x={(x0 * 2 + barLen) / 2} y={y0 - 5}
        textAnchor="middle" fontSize={10} fontFamily="monospace" fill={COL_POS}
        style={{ userSelect: 'none' }}>
        {`${maxAbs.toFixed(1)} ${unit}`}
      </text>
    </g>
  );
}

// ─── Diagrama de esfuerzos (M ó V) ────────────────────────────────────────

function DiagramEsfuerzo({ geo, elems, tipo, tipoBase, nodeReactions }) {
  const [hover, setHover] = useState(null);
  const { he } = geo;

  const scale_d = autoScale(elems, tipo, he, 0.32);
  const getArr = (el) => tipo === 'M' ? el.M : tipo === 'N' ? el.N : el.V;
  const maxAbs = Math.max(...elems.flatMap(el => getArr(el).map(Math.abs)), 0.01);
  const diagExt = scale_d * maxAbs;
  const unit = tipo === 'M' ? 'kN·m' : 'kN';

  const tx = useMemo(() => makeTransform(geo, diagExt), [geo, diagExt]);
  const nodes = nodePositions(geo);

  // ── Etiquetas deduplicadas por nodo ──
  // Un nodo puede tener valores de hasta 2 elementos adyacentes.
  // Mostramos el valor de UN solo elemento por nodo (el mayor en abs).
  const nodeLabels = useMemo(() => {
    // nodeIdx → { v, pt, perpX, perpY, elemIdx }
    const perNode = {};
    elems.forEach((el, e) => {
      const arr = getArr(el);
      const [ni, nj] = CONN[e];
      [[ni, arr[0], el.ptsGlobal[0]],
       [nj, arr[arr.length - 1], el.ptsGlobal[el.ptsGlobal.length - 1]]
      ].forEach(([nodeIdx, v, pt]) => {
        if (Math.abs(v) < 0.05) return;
        if (!perNode[nodeIdx] || Math.abs(v) > Math.abs(perNode[nodeIdx].v)) {
          perNode[nodeIdx] = { v, px: pt.px, py: pt.py, perpX: el.perpX, perpY: el.perpY };
        }
      });
    });
    const extra = 10 / tx.scale; // 10 SVG units → metros mundo, empuja etiqueta fuera del relleno
    return Object.values(perNode).map(({ v, px, py, perpX, perpY }) => {
      const sign = tipo === 'M' ? -1 : 1;  // N and V use same direction as V
      return {
        v,
        sx: tx.toSvgX(px + (v * scale_d + extra) * perpX * sign),
        sy: tx.toSvgY(py + (v * scale_d + extra) * perpY * sign),
        color: v >= 0 ? COL_POS : COL_NEG,
      };
    });
  }, [elems, tipo, scale_d, tx]);

  // ── Etiqueta en el pico interior de cada elemento ──
  const peakLabels = useMemo(() => {
    const extra = 10 / tx.scale;
    return elems.flatMap((el, e) => {
      const arr = getArr(el);
      const maxIdx = arr.reduce((best, v, i) => Math.abs(v) > Math.abs(arr[best]) ? i : best, 0);
      if (maxIdx === 0 || maxIdx === arr.length - 1) return [];
      const v = arr[maxIdx];
      if (Math.abs(v) < 0.05) return [];
      const sign = tipo === 'M' ? -1 : 1;
      const pt = el.ptsGlobal[maxIdx];
      return [{
        v,
        sx: tx.toSvgX(pt.px + (v * scale_d + extra) * el.perpX * sign),
        sy: tx.toSvgY(pt.py + (v * scale_d + extra) * el.perpY * sign),
        color: v >= 0 ? COL_POS : COL_NEG,
      }];
    });
  }, [elems, tipo, scale_d, tx]);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (VB_W / rect.width);
    const svgY = (e.clientY - rect.top)  * (VB_H / rect.height);
    setHover(findHoverInfo(svgX, svgY, tx, elems));
  }, [tx, elems]);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block', width: '100%', height: 'auto', background: C.bg, cursor: 'crosshair' }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>

      {/* Cuadrículas de referencia */}
      {[0, geo.he, geo.hc].map((y, i) => (
        <line key={i}
          x1={tx.toSvgX(-diagExt * 0.35)} y1={tx.toSvgY(y)}
          x2={tx.toSvgX(geo.B + diagExt * 0.35)} y2={tx.toSvgY(y)}
          stroke={C.bd} strokeWidth={0.5} strokeDasharray="3,5" />
      ))}

      {/* Eje de cada elemento (línea de base) */}
      {elems.map((el, e) => (
        <line key={`ax-${e}`}
          x1={tx.toSvgX(el.xi)} y1={tx.toSvgY(el.yi)}
          x2={tx.toSvgX(el.xj)} y2={tx.toSvgY(el.yj)}
          stroke={COL_AXIS} strokeWidth={0.8} strokeDasharray="2,4" opacity={0.45} />
      ))}

      {/* Polígonos de diagrama */}
      {elems.map((el, e) => {
        const arr = getArr(el);
        const pX = tipo === 'M' ? -el.perpX : el.perpX;  // N and V use +perp direction
        const pY = tipo === 'M' ? -el.perpY : el.perpY;
        const segs = segmentsBySign(arr, el.ptsGlobal, pX, pY, scale_d);
        return segs.map((seg, si) => (
          <polygon key={`seg-${e}-${si}`}
            points={pts2svg(seg.polyPoints, tx)}
            fill={(seg.positive ? COL_POS : COL_NEG) + '4a'}
            stroke={seg.positive ? COL_POS : COL_NEG}
            strokeWidth={1.2} fillRule="nonzero" />
        ));
      })}

      {/* Esqueleto del pórtico (encima) */}
      <FrameOutline geo={geo} tx={tx} stroke={C.ac} sw={2.5} />

      {/* Puntos nodales */}
      {nodes.map(([x, y], i) => (
        <NodeDot key={i} x={x} y={y} tx={tx} fill={C.ac} r={3.5} />
      ))}

      {/* Símbolos de apoyo — tamaño proporcional a altura de columna */}
      {(() => {
        const s = Math.max(8, Math.min(20, tx.toSvgLen(geo.he * 0.07)));
        return tipoBase === 'empotrada' ? (
          <>
            <SupportFixed  sx={tx.toSvgX(0)}     sy={tx.toSvgY(0)} size={s} />
            <SupportFixed  sx={tx.toSvgX(geo.B)} sy={tx.toSvgY(0)} size={s} />
          </>
        ) : (
          <>
            <SupportPinned sx={tx.toSvgX(0)}     sy={tx.toSvgY(0)} size={s} />
            <SupportPinned sx={tx.toSvgX(geo.B)} sy={tx.toSvgY(0)} size={s} />
          </>
        );
      })()}

      {/* Etiquetas en nodos */}
      {nodeLabels.map((lbl, i) => (
        <LabelWithBg key={`nl-${i}`}
          sx={lbl.sx} sy={lbl.sy}
          text={`${lbl.v >= 0 ? '+' : ''}${lbl.v.toFixed(1)}`}
          color={lbl.color} anchor="middle" dy={0} fontSize={9} />
      ))}

      {/* Etiquetas en picos interiores */}
      {peakLabels.map((lbl, i) => (
        <LabelWithBg key={`pk-${i}`}
          sx={lbl.sx} sy={lbl.sy}
          text={`${lbl.v >= 0 ? '+' : ''}${lbl.v.toFixed(1)}`}
          color={lbl.color} anchor="middle" dy={0} fontSize={9} />
      ))}

      {/* Cotas geometría */}
      <DimensionAnnotations geo={geo} tx={tx} />

      {/* Reacciones (si están activas) */}
      {nodeReactions && (
        <ReactionArrows geo={geo} tx={tx} nodeReactions={nodeReactions} tipoBase={tipoBase} />
      )}

      {/* Tooltip hover */}
      <HoverTooltip info={hover} tipo={tipo} />
    </svg>
  );
}

// ─── Diagrama de deformada ─────────────────────────────────────────────────

function DiagramDeformada({ geo, comboResult, tipoBase, nodeReactions }) {
  const [hover, setHover] = useState(null);
  const { he } = geo;

  const scaleFactor = autoDeformScale(comboResult, he);
  const defElems    = computarDeformada(geo, comboResult, scaleFactor);
  // Para hit-test sobre eje sin deformar
  const elems = useMemo(() => computarDiagramas(geo, comboResult), [geo, comboResult]);

  const allPts = defElems.flatMap(el => el.pts);
  const safeExt = allPts.length
    ? Math.max(
        ...allPts.map(p => Math.abs(p.px - geo.B / 2) - geo.B / 2),
        ...allPts.map(p => Math.abs(p.py - geo.hc / 2) - geo.hc / 2),
        he * 0.04,
      ) + he * 0.05
    : he * 0.08;

  const tx = useMemo(() => makeTransform(geo, Math.max(safeExt, he * 0.02)), [geo, safeExt, he]);
  const nodes = nodePositions(geo);

  const U = comboResult?.displacements;
  const defNodes = U ? nodes.map(([x, y], i) => ({
    px: x + scaleFactor * U[i * 3],
    py: y + scaleFactor * U[i * 3 + 1],
  })) : null;

  const maxDisp = U
    ? Math.max(...Array.from({ length: 5 }, (_, i) =>
        Math.sqrt(U[i * 3] ** 2 + U[i * 3 + 1] ** 2)), 1e-9) * 1000
    : 0;

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (VB_W / rect.width);
    const svgY = (e.clientY - rect.top)  * (VB_H / rect.height);
    setHover(findHoverDeform(svgX, svgY, tx, elems, comboResult));
  }, [tx, elems, comboResult]);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block', width: '100%', height: 'auto', background: C.bg, cursor: 'crosshair' }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>

      {/* Cuadrículas */}
      {[0, geo.he, geo.hc].map((y, i) => (
        <line key={i}
          x1={tx.toSvgX(-safeExt * 0.6)} y1={tx.toSvgY(y)}
          x2={tx.toSvgX(geo.B + safeExt * 0.6)} y2={tx.toSvgY(y)}
          stroke={C.bd} strokeWidth={0.5} strokeDasharray="3,5" />
      ))}

      {/* Pórtico original (referencia) */}
      <FrameOutline geo={geo} tx={tx} stroke={COL_ORIG} sw={1.5} dasharray="3,4" />
      {nodes.map(([x, y], i) => (
        <NodeDot key={`o-${i}`} x={x} y={y} tx={tx} fill={COL_ORIG} r={2.5} />
      ))}

      {/* Deformada interpolada */}
      {defElems.map((el, e) => {
        if (!el.pts.length) return null;
        const d = el.pts.map((p, k) =>
          `${k === 0 ? 'M' : 'L'} ${tx.toSvgX(p.px).toFixed(1)},${tx.toSvgY(p.py).toFixed(1)}`
        ).join(' ');
        return <path key={`def-${e}`} d={d} fill="none"
          stroke={COL_DEF} strokeWidth={2.5} strokeLinejoin="round" />;
      })}

      {/* Nodos deformados */}
      {defNodes && defNodes.map((n, i) => (
        <NodeDot key={`dn-${i}`} x={n.px} y={n.py} tx={tx} fill={COL_DEF} r={4} />
      ))}

      {/* Etiquetas de desplazamiento en aleros y cumbrera */}
      {U && [1, 2, 3].map(i => {
        const [x0, y0] = nodes[i];
        const dx = U[i * 3] * 1000, dy = U[i * 3 + 1] * 1000;
        const xd = x0 + scaleFactor * U[i * 3];
        const yd = y0 + scaleFactor * U[i * 3 + 1];
        const txt = `(${dx >= 0 ? '+' : ''}${dx.toFixed(1)}, ${dy >= 0 ? '+' : ''}${dy.toFixed(1)}) mm`;
        const anchor = i === 1 ? 'end' : i === 3 ? 'start' : 'middle';
        return (
          <LabelWithBg key={`dl-${i}`}
            sx={tx.toSvgX(xd)} sy={tx.toSvgY(yd)}
            text={txt} color={COL_DEF}
            anchor={anchor} dy={-7} fontSize={9.5} />
        );
      })}

      {/* Símbolos de apoyo — tamaño proporcional a altura de columna */}
      {(() => {
        const s = Math.max(8, Math.min(20, tx.toSvgLen(geo.he * 0.07)));
        return tipoBase === 'empotrada' ? (
          <>
            <SupportFixed  sx={tx.toSvgX(0)}     sy={tx.toSvgY(0)} size={s} />
            <SupportFixed  sx={tx.toSvgX(geo.B)} sy={tx.toSvgY(0)} size={s} />
          </>
        ) : (
          <>
            <SupportPinned sx={tx.toSvgX(0)}     sy={tx.toSvgY(0)} size={s} />
            <SupportPinned sx={tx.toSvgX(geo.B)} sy={tx.toSvgY(0)} size={s} />
          </>
        );
      })()}

      {/* Factor de amplificación */}
      <text x={VB_W - 8} y={VB_H - 10} textAnchor="end" fontSize={8.5}
        fontFamily="monospace" fill={C.dm} style={{ userSelect: 'none' }}>
        {`Amp. ×${scaleFactor < 10 ? scaleFactor.toFixed(1) : Math.round(scaleFactor)}  |  δ_max = ${maxDisp.toFixed(2)} mm`}
      </text>

      {/* Cotas geometría */}
      <DimensionAnnotations geo={geo} tx={tx} />

      {/* Reacciones (si están activas) */}
      {nodeReactions && (
        <ReactionArrows geo={geo} tx={tx} nodeReactions={nodeReactions} tipoBase={tipoBase} />
      )}

      {/* Tooltip hover */}
      <HoverTooltip info={hover} tipo="def" />
    </svg>
  );
}

// ─── Tipos de diagrama ─────────────────────────────────────────────────────

const DIAGRAM_TYPES = [
  { id: 'M',      label: 'Momento',   unit: 'kN·m', desc: 'Diagrama de Momento Flector (DMF)' },
  { id: 'V',      label: 'Corte',     unit: 'kN',   desc: 'Diagrama de Fuerza de Corte (DFC)' },
  { id: 'N',      label: 'Axial',     unit: 'kN',   desc: 'Diagrama de Fuerza Axial (DFA) · + tracción · − compresión' },
  { id: 'cargas', label: 'Cargas',    unit: 'kN/m', desc: 'Cargas distribuidas aplicadas en la combinación seleccionada' },
  { id: 'def',    label: 'Deformada', unit: 'mm',   desc: 'Deformada amplificada (interpolación de Hermite)' },
];

// Grupos de combinaciones
const GROUP_LABELS = {
  elu:   'ELU — Estados últimos',
  els:   'ELS — Servicio (Ws V50)',
  basic: 'Básicos — Casos individuales',
};
const GROUP_ORDER = ['elu', 'els', 'basic'];

// ─── Diagrama de cargas distribuidas ───────────────────────────────────────

const COL_LOAD_POS = '#22d3ee';  // cian — cargas perpendiculares positivas
const COL_LOAD_NEG = '#fb923c';  // naranja — cargas perpendiculares negativas
const COL_LOAD_AX  = '#a78bfa';  // violeta — cargas axiales

/**
 * Cotas de geometría: B (ancho), he (alero), hc (cumbrera).
 * Dibujadas en gris claro fuera del área de diagramas para no interferir.
 */
function DimensionAnnotations({ geo, tx }) {
  const { B, he, hc } = geo;
  const col = COL_AXIS;
  const fs = 8;

  // ── Cota B: flecha horizontal debajo del pórtico ──────────────────────────
  const yB   = tx.toSvgY(-0.65 * (he * 0.12 + 0.4)); // justo debajo de los apoyos
  const x0B  = tx.toSvgX(0);
  const x1B  = tx.toSvgX(B);
  const tickH = 6;
  const aw = 4, ah = 7;

  // ── Cota he: flecha vertical a la izquierda ────────────────────────────────
  const xHe   = tx.toSvgX(-B * 0.065);
  const y0He  = tx.toSvgY(0);
  const y1He  = tx.toSvgY(he);

  // ── Cota hc: línea ref horizontal punteada en y=hc ────────────────────────
  // Acortada al centro para no superponerse con flechas de carga en columnas
  const ySvgHc = tx.toSvgY(hc);
  const x0Hc  = tx.toSvgX(B * 0.15);
  const x1Hc  = tx.toSvgX(B * 0.85);

  return (
    <g opacity={0.65}>
      {/* ── B ── */}
      <line x1={x0B} y1={yB} x2={x1B} y2={yB} stroke={col} strokeWidth={0.8} />
      {/* arrowheads */}
      <polygon points={`${x0B},${yB} ${x0B+ah},${yB-aw} ${x0B+ah},${yB+aw}`} fill={col} />
      <polygon points={`${x1B},${yB} ${x1B-ah},${yB-aw} ${x1B-ah},${yB+aw}`} fill={col} />
      {/* testigos */}
      <line x1={x0B} y1={tx.toSvgY(0)+tickH} x2={x0B} y2={yB+tickH} stroke={col} strokeWidth={0.5} strokeDasharray="2,2" />
      <line x1={x1B} y1={tx.toSvgY(0)+tickH} x2={x1B} y2={yB+tickH} stroke={col} strokeWidth={0.5} strokeDasharray="2,2" />
      <text x={(x0B+x1B)/2} y={yB-4} textAnchor="middle" fontSize={fs} fill={col} fontFamily="monospace">
        B={B}m
      </text>

      {/* ── he ── */}
      <line x1={xHe} y1={y0He} x2={xHe} y2={y1He} stroke={col} strokeWidth={0.8} />
      <polygon points={`${xHe},${y0He} ${xHe-aw},${y0He-ah} ${xHe+aw},${y0He-ah}`} fill={col} />
      <polygon points={`${xHe},${y1He} ${xHe-aw},${y1He+ah} ${xHe+aw},${y1He+ah}`} fill={col} />
      <text x={xHe-4} y={(y0He+y1He)/2} textAnchor="middle" fontSize={fs} fill={col} fontFamily="monospace"
        transform={`rotate(-90 ${xHe-4} ${(y0He+y1He)/2})`}>
        he={he}m
      </text>

      {/* ── hc ── */}
      <line x1={x0Hc} y1={ySvgHc} x2={x1Hc} y2={ySvgHc}
        stroke={col} strokeWidth={0.6} strokeDasharray="4,3" />
      <text x={(x0Hc+x1Hc)/2} y={ySvgHc-3} textAnchor="middle" fontSize={fs} fill={col} fontFamily="monospace">
        hc={hc}m
      </text>
    </g>
  );
}

/**
 * Dibuja flechas de reacción en los apoyos (Rx, Ry, Mz).
 * Las etiquetas se muestran apiladas en bloques verticales junto a cada apoyo.
 */
function ReactionArrows({ geo, tx, nodeReactions, tipoBase }) {
  if (!nodeReactions) return null;
  const parts = [];
  const arrowLen = geo.he * 0.11;
  const ah = 5 / tx.scale;
  const aw = 3 / tx.scale;

  const supports = [
    { key: 'n0', x: 0,     y: 0, r: nodeReactions.node0, side: 'left' },
    { key: 'n4', x: geo.B, y: 0, r: nodeReactions.node4, side: 'right' },
  ];

  for (const sup of supports) {
    const { x, y, r, key, side } = sup;
    if (!r) continue;
    const isLeft = side === 'left';

    // ── Flecha Rx ──
    if (Math.abs(r.Rx) > 0.01) {
      const dir = Math.sign(r.Rx);
      const x2 = x + dir * arrowLen;
      const sx1 = tx.toSvgX(x), sy = tx.toSvgY(y + arrowLen * 0.55);
      const sx2 = tx.toSvgX(x2);
      const p1x = tx.toSvgX(x2 - dir * ah), p1y = sy - tx.toSvgLen(aw);
      const p2x = tx.toSvgX(x2 - dir * ah), p2y = sy + tx.toSvgLen(aw);
      parts.push(
        <line key={`${key}-rx`} x1={sx1} y1={sy} x2={sx2} y2={sy}
          stroke={COL_REACT} strokeWidth={2} opacity={0.9} />,
        <polygon key={`${key}-rxh`} points={`${sx2},${sy} ${p1x},${p1y} ${p2x},${p2y}`}
          fill={COL_REACT} opacity={0.9} />
      );
    }

    // ── Flecha Ry ──
    if (Math.abs(r.Ry) > 0.01) {
      const dir = Math.sign(r.Ry);
      const y2 = y + dir * arrowLen;
      const sx = tx.toSvgX(x), sy1 = tx.toSvgY(y), sy2 = tx.toSvgY(y2);
      const p1x = sx - tx.toSvgLen(aw), p1y = tx.toSvgY(y2 - dir * ah);
      const p2x = sx + tx.toSvgLen(aw), p2y = tx.toSvgY(y2 - dir * ah);
      parts.push(
        <line key={`${key}-ry`} x1={sx} y1={sy1} x2={sx} y2={sy2}
          stroke={COL_REACT} strokeWidth={2} opacity={0.9} />,
        <polygon key={`${key}-ryh`} points={`${sx},${sy2} ${p1x},${p1y} ${p2x},${p2y}`}
          fill={COL_REACT} opacity={0.9} />
      );
    }

    // ── Arco Mz (empotrada) ──
    if (tipoBase === 'empotrada' && Math.abs(r.Mz) > 0.01) {
      const radius = arrowLen * 0.45;
      const scx = tx.toSvgX(x), scy = tx.toSvgY(y);
      const sr = tx.toSvgLen(radius);
      const toRad = a => a * Math.PI / 180;
      const startA = r.Mz > 0 ? -30 : 150;
      const endA   = r.Mz > 0 ? 150  : -30;
      const ax1 = scx + sr * Math.cos(toRad(startA)), ay1 = scy - sr * Math.sin(toRad(startA));
      const ax2 = scx + sr * Math.cos(toRad(endA)),   ay2 = scy - sr * Math.sin(toRad(endA));
      parts.push(
        <path key={`${key}-mz`}
          d={`M ${ax1} ${ay1} A ${sr} ${sr} 0 1 ${r.Mz > 0 ? 0 : 1} ${ax2} ${ay2}`}
          stroke={COL_REACT} strokeWidth={1.5} fill="none" opacity={0.9} />
      );
    }

    // ── Bloque de etiquetas apiladas (fuera del frame) ──
    // Posición fija en el borde del SVG para evitar superposición
    const lblLines = [
      `Ry=${r.Ry >= 0 ? '+' : ''}${r.Ry.toFixed(1)} kN`,
      `Rx=${r.Rx >= 0 ? '+' : ''}${r.Rx.toFixed(1)} kN`,
      ...(tipoBase === 'empotrada' ? [`Mz=${r.Mz >= 0 ? '+' : ''}${r.Mz.toFixed(1)} kN·m`] : []),
    ];
    const lineH = 13;
    // Anclar en la esquina inferior del SVG, dentro del padding
    const blockSvgX = isLeft ? 6 : VB_W - 6;
    const blockSvgY = VB_H - 10 - lblLines.length * lineH;
    const anchor = isLeft ? 'start' : 'end';

    lblLines.forEach((txt, i) => {
      parts.push(
        <LabelWithBg key={`${key}-lbl-${i}`}
          sx={blockSvgX} sy={blockSvgY + i * lineH}
          text={txt} color={COL_REACT} anchor={anchor} fontSize={8.5} />
      );
    });
  }

  return <g>{parts}</g>;
}

/**
 * Tabla compacta de reacciones para mostrar debajo de los diagramas.
 */
function ReactionTable({ nodeReactions, tipoBase }) {
  if (!nodeReactions) return null;
  const { node0, node4 } = nodeReactions;
  const fmt = v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(2) : '—';
  const isEmp = tipoBase === 'empotrada';

  return (
    <div className="rounded p-2 text-[10px]"
      style={{ background: C.cd, border: `1px solid ${C.bd}`, color: C.tx }}>
      <div className="font-semibold mb-1" style={{ color: COL_REACT }}>Reacciones en apoyos</div>
      <table className="w-full text-center" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: C.dm, borderBottom: `1px solid ${C.bd}` }}>
            <th className="px-2 py-0.5 text-left">Apoyo</th>
            <th className="px-2 py-0.5">Rx [kN]</th>
            <th className="px-2 py-0.5">Ry [kN]</th>
            {isEmp && <th className="px-2 py-0.5">Mz [kN·m]</th>}
          </tr>
        </thead>
        <tbody style={{ fontFamily: 'monospace' }}>
          <tr>
            <td className="px-2 py-0.5 text-left" style={{ color: C.dm }}>Izq (nodo 0)</td>
            <td className="px-2 py-0.5">{fmt(node0?.Rx)}</td>
            <td className="px-2 py-0.5">{fmt(node0?.Ry)}</td>
            {isEmp && <td className="px-2 py-0.5">{fmt(node0?.Mz)}</td>}
          </tr>
          <tr>
            <td className="px-2 py-0.5 text-left" style={{ color: C.dm }}>Der (nodo 4)</td>
            <td className="px-2 py-0.5">{fmt(node4?.Rx)}</td>
            <td className="px-2 py-0.5">{fmt(node4?.Ry)}</td>
            {isEmp && <td className="px-2 py-0.5">{fmt(node4?.Mz)}</td>}
          </tr>
          <tr style={{ borderTop: `1px solid ${C.bd}`, fontWeight: 600 }}>
            <td className="px-2 py-0.5 text-left" style={{ color: C.dm }}>Σ</td>
            <td className="px-2 py-0.5">{fmt((node0?.Rx || 0) + (node4?.Rx || 0))}</td>
            <td className="px-2 py-0.5">{fmt((node0?.Ry || 0) + (node4?.Ry || 0))}</td>
            {isEmp && <td className="px-2 py-0.5">{fmt((node0?.Mz || 0) + (node4?.Mz || 0))}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renderiza flechas de cargas distribuidas para todos los elementos cargados.
 *
 * @param {Object} p
 * @param {Object} p.geo       - Geometría del pórtico
 * @param {Object} p.tx        - Transform mundo → SVG
 * @param {Array}  p.loadsData - [{elemIdx, wPerp, wAxial}] — loads del combo
 */
function DiagramCargas({ geo, tx, loadsData }) {
  if (!loadsData?.length) return null;

  const nodes = nodePositions(geo);
  // Calcular theta real de cada elemento a partir de la geometría nodal
  const thetas = CONN.map(([ni, nj]) => {
    const [xi, yi] = nodes[ni], [xj, yj] = nodes[nj];
    return Math.atan2(yj - yi, xj - xi);
  });
  // Perpendiculares de cada elemento: (-sin θ, cos θ)
  const perps = thetas.map(t => ({ px: -Math.sin(t), py: Math.cos(t) }));

  // Escala: maxAbs * scale_q = 22% de he en mundo
  const maxQ = Math.max(
    ...loadsData.flatMap(l => [Math.abs(l.wPerp || 0), Math.abs(l.wAxial || 0)]),
    0.01,
  );
  const scale_q = (0.22 * geo.he) / maxQ;

  const N_ARROWS = 6;  // flechas por elemento

  return (
    <g>
      {loadsData.map((ld, di) => {
        const e = ld.elemIdx;
        const [ni, nj] = CONN[e];
        const [xi, yi] = nodes[ni];
        const [xj, yj] = nodes[nj];
        const dx = xj - xi, dy = yj - yi;
        const { px: perpX, py: perpY } = perps[e];
        const parts = [];

        // ── Carga perpendicular (wPerp) ──
        if (Math.abs(ld.wPerp || 0) > 1e-6) {
          const w = ld.wPerp;
          const qLen = Math.abs(w) * scale_q;
          const col = w > 0 ? COL_LOAD_POS : COL_LOAD_NEG;
          const signQ = Math.sign(w);

          // Puntos de punta de flecha (extremo del cuerpo de flecha)
          const tips = Array.from({ length: N_ARROWS }, (_, k) => {
            const t = k / (N_ARROWS - 1);
            const bx = xi + t * dx, by = yi + t * dy;
            return {
              bx, by,
              tx_: bx - signQ * qLen * perpX,
              ty_: by - signQ * qLen * perpY,
            };
          });

          // Cabeza de flecha: el punto de la flecha APUNTA HACIA el elemento (presión empuja)
          // Para w > 0: flecha apunta en +perp → base está en +qLen, punta en 0 (elemento)
          // Para w < 0: flecha apunta en -perp → base en -qLen, punta en 0
          // Cambiamos la convención: la flecha parte desde la "base" (punta alejada) hacia el elemento
          const arrowHead = 5 / tx.scale;  // [metros mundo]
          const arrowW = 3 / tx.scale;

          tips.forEach(({ bx, by, tx_, ty_ }) => {
            // Línea de cuerpo (desde base hasta punta en el elemento)
            const lk = parts.length;
            parts.push(
              <line key={`p${lk}`}
                x1={tx.toSvgX(tx_)} y1={tx.toSvgY(ty_)}
                x2={tx.toSvgX(bx)}  y2={tx.toSvgY(by)}
                stroke={col} strokeWidth={1.3} opacity={0.9} />
            );
            // Cabeza de flecha en la punta (sobre el elemento)
            const ah = arrowHead, aw = arrowW;
            const cx = bx, cy = by;
            const lx = cx - signQ * ah * perpX, ly = cy - signQ * ah * perpY;
            // Dos alas perpendiculares a la dirección de la flecha (a lo largo del eje del elem)
            const axDir = Math.cos(thetas[e]), ayDir = Math.sin(thetas[e]);
            const p1x = tx.toSvgX(lx + aw * axDir),  p1y = tx.toSvgY(ly + aw * ayDir);
            const p2x = tx.toSvgX(lx - aw * axDir),  p2y = tx.toSvgY(ly - aw * ayDir);
            const ptx = tx.toSvgX(cx), pty = tx.toSvgY(cy);
            const pk = parts.length;
            parts.push(
              <polygon key={`p${pk}`}
                points={`${p1x},${p1y} ${p2x},${p2y} ${ptx},${pty}`}
                fill={col} opacity={0.9} />
            );
          });

          // Línea conectando puntas de flechas (indica distribución uniforme)
          const tipPts = tips.map(({ tx_, ty_ }) =>
            `${tx.toSvgX(tx_).toFixed(1)},${tx.toSvgY(ty_).toFixed(1)}`
          ).join(' ');
          parts.push(
            <polyline key={`bar-${di}`}
              points={tipPts} fill="none"
              stroke={col} strokeWidth={1.8} opacity={0.85} strokeLinejoin="round" />
          );

          // Etiqueta en el centro del elemento
          const midBx = (xi + xj) / 2, midBy = (yi + yj) / 2;
          const labelX = tx.toSvgX(midBx - signQ * (qLen + 12 / tx.scale) * perpX);
          const labelY = tx.toSvgY(midBy - signQ * (qLen + 12 / tx.scale) * perpY);
          parts.push(
            <LabelWithBg key={`lbl-${di}`}
              sx={labelX} sy={labelY}
              text={`${w > 0 ? '+' : ''}${w.toFixed(2)} kN/m`}
              color={col} anchor="middle" fontSize={9.5} />
          );
        }

        // ── Carga axial (wAxial) — flecha única en el tercio central ──
        // Se omite en columnas (e=0,3) para no superponer con otras anotaciones
        const isColElem = (e === 0 || e === 3);
        if (!isColElem && Math.abs(ld.wAxial || 0) > 1e-6) {
          const wa = ld.wAxial;
          const col = COL_LOAD_AX;
          const t = 0.5;
          // Para columnas (e=0,3), offset perpendicular al exterior para visibilidad
          const isCol = (e === 0 || e === 3);
          const offDist = isCol ? geo.B * 0.08 : 0;
          const pxE = -Math.sin(thetas[e]);
          const pyE =  Math.cos(thetas[e]);
          const bx = xi + t * dx + pxE * offDist;
          const by = yi + t * dy + pyE * offDist;
          const axLen = Math.abs(wa) * scale_q * 0.8;
          const axDirX = Math.cos(thetas[e]) * Math.sign(wa);
          const axDirY = Math.sin(thetas[e]) * Math.sign(wa);
          const tipSx = tx.toSvgX(bx + axDirX * axLen);
          const tipSy = tx.toSvgY(by + axDirY * axLen);
          parts.push(
            <line key={`axl-${di}`}
              x1={tx.toSvgX(bx)} y1={tx.toSvgY(by)}
              x2={tipSx} y2={tipSy}
              stroke={col} strokeWidth={1.8} markerEnd="none" opacity={0.85} />
          );
          // Arrowhead en el extremo de la línea axial
          if (axLen > 1e-6) {
            const aw = 4; // píxeles SVG
            const ah = 7;
            // Dirección en SVG (y invertida)
            const adxSvg = tx.toSvgX(bx + axDirX) - tx.toSvgX(bx);
            const adySvg = tx.toSvgY(by + axDirY) - tx.toSvgY(by);
            const adLen = Math.hypot(adxSvg, adySvg) || 1;
            const ux = adxSvg / adLen, uy = adySvg / adLen; // unit axial
            const px = -uy, py = ux; // perpendicular
            const bsX = tipSx - ux * ah, bsY = tipSy - uy * ah;
            parts.push(
              <polygon key={`axarr-${di}`}
                points={`${tipSx},${tipSy} ${bsX + px*aw},${bsY + py*aw} ${bsX - px*aw},${bsY - py*aw}`}
                fill={col} opacity={0.85} />
            );
          }
          // Label: para columnas, al lado del offset; para rafters, al extremo
          let lblSx, lblSy, lblAnchor;
          if (isCol) {
            // Columna izq (e=0): etiqueta a la IZQUIERDA → anchor "end"
            // Columna der (e=3): etiqueta a la IZQUIERDA del frame también (inward) → anchor "start"
            const lblPx = e === 0 ? pxE : -pxE; // col izq: exterior; col der: interior (para no cortar)
            const lblExtra = 8 / tx.scale;
            const midX = bx - axDirX * axLen * 0.5;
            const midY = by - axDirY * axLen * 0.5;
            lblSx = tx.toSvgX(midX + lblPx * (offDist + lblExtra));
            lblSy = tx.toSvgY(midY);
            lblAnchor = e === 0 ? 'start' : 'end';
          } else {
            lblSx = tx.toSvgX(bx + axDirX * (axLen + 8 / tx.scale));
            lblSy = tx.toSvgY(by + axDirY * (axLen + 8 / tx.scale));
            lblAnchor = 'middle';
          }
          parts.push(
            <LabelWithBg key={`axlbl-${di}`}
              sx={lblSx} sy={lblSy}
              text={`${wa > 0 ? '+' : ''}${wa.toFixed(2)} kN/m`}
              color={col} anchor={lblAnchor} fontSize={9} />
          );
        }

        return <g key={`ld-${di}`}>{parts}</g>;
      })}
    </g>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────

export function TabDiagramas({ result, geo, initialComboId, windCalc }) {
  const [comboIdx, setComboIdx] = useState(0);
  const [diagType, setDiagType] = useState('M');
  const [showReactions, setShowReactions] = useState(false);

  useEffect(() => {
    if (!initialComboId || !result?.combinaciones) return;
    const idx = result.combinaciones.findIndex(c => c.id === initialComboId);
    if (idx >= 0) setComboIdx(idx);
  }, [initialComboId, result?.combinaciones]);

  if (!result) return (
    <div className="p-4 text-sm" style={{ color: C.pos }}>
      Sin resultados. Verificar geometría y cargas.
    </div>
  );

  const combos = result.combinaciones || [];
  if (!combos.length) return (
    <div className="p-4 text-sm" style={{ color: C.dm }}>Sin combinaciones calculadas.</div>
  );

  const selCombo = combos[Math.min(comboIdx, combos.length - 1)];
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const elems = useMemo(() => computarDiagramas(geo, selCombo), [geo, selCombo]);

  return (
    <div className="p-4 space-y-3">
      {/* ── Selectores ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-[10px] mb-0.5" style={{ color: C.dm }}>
            Combinación de carga
          </label>
          <select value={comboIdx} onChange={e => setComboIdx(+e.target.value)}
            className="rounded px-2 py-1 text-xs"
            style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}` }}>
            {GROUP_ORDER.map(g => {
              const gCombos = combos.map((c, i) => ({ ...c, i })).filter(c => (c.group || 'elu') === g);
              if (!gCombos.length) return null;
              return (
                <optgroup key={g} label={GROUP_LABELS[g]}>
                  {gCombos.map(c => (
                    <option key={c.i} value={c.i}>{c.nombre || c.id}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-[10px] mb-0.5" style={{ color: C.dm }}>
            Tipo de diagrama
          </label>
          <div className="flex gap-1 flex-wrap">
            {DIAGRAM_TYPES.map(dt => (
              <button key={dt.id} onClick={() => setDiagType(dt.id)}
                className="px-3 py-1 rounded text-xs font-semibold"
                style={{
                  background: diagType === dt.id ? C.ac + '30' : C.cd,
                  color: diagType === dt.id ? C.ac : C.dm,
                  border: `1px solid ${diagType === dt.id ? C.ac : C.bd}`,
                }}>
                {dt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mostrar reacciones — solo para M/V/N/def */}
        {(diagType === 'M' || diagType === 'V' || diagType === 'N' || diagType === 'def') && selCombo?.nodeReactions && (
          <label className="flex items-center gap-1.5 text-xs cursor-pointer ml-2 select-none"
            style={{ color: showReactions ? COL_REACT : C.dm }}>
            <input type="checkbox" checked={showReactions} onChange={e => setShowReactions(e.target.checked)}
              className="accent-green-400 cursor-pointer" />
            Reacciones
          </label>
        )}

        {/* Leyenda de colores */}
        {diagType !== 'def' && diagType !== 'cargas' && (
          <div className="flex items-center gap-3 text-[10px] ml-2">
            <span style={{ color: COL_POS }}>■ positivo</span>
            <span style={{ color: COL_NEG }}>■ negativo</span>
          </div>
        )}
        {diagType === 'cargas' && (
          <div className="flex items-center gap-3 text-[10px] ml-2">
            <span style={{ color: COL_LOAD_POS }}>■ perp +</span>
            <span style={{ color: COL_LOAD_NEG }}>■ perp −</span>
            <span style={{ color: COL_LOAD_AX }}>■ axial</span>
            <span style={{ color: COL_REACT }}>■ reacciones</span>
          </div>
        )}
      </div>

      {/* ── Banner de velocidades ── */}
      {windCalc && (
        <div className="text-[10px] px-1 py-0.5 rounded"
          style={{ background: C.cd, border: `1px solid ${C.bd}`, color: C.dm }}>
          <span style={{ color: C.ac }}>V diseño</span> = {windCalc.V} m/s (700 años MRI)
          {' · '}
          <span style={{ color: C.ok }}>V servicio</span> = {windCalc.V_service} m/s (50 años MRI)
          {' · '}ELS usa V servicio
        </div>
      )}

      {/* ── Nota metodológica corta ── */}
      <div className="text-[10px]" style={{ color: C.dm }}>
        {DIAGRAM_TYPES.find(d => d.id === diagType)?.desc}
        {diagType === 'M' && ' · dibujado del lado de la fibra comprimida'}
        {diagType === 'V' && ' · +V = corte horario sobre el elemento'}
        {diagType === 'N' && ' · + tracción (rojo), − compresión (azul)'}
        {diagType === 'def' && ' · desplazamientos amplificados para visualización'}
        {(diagType === 'M' || diagType === 'V' || diagType === 'N' || diagType === 'def') && (
          <span style={{ color: C.ok }}> · Hover para ver valores intermedios</span>
        )}
      </div>

      {/* ── SVG del diagrama ── */}
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.bd}` }}>
        {(diagType === 'M' || diagType === 'V' || diagType === 'N') && (
          <DiagramEsfuerzo geo={geo} elems={elems} tipo={diagType} tipoBase={geo.tipoBase}
            nodeReactions={showReactions ? selCombo.nodeReactions : null} />
        )}
        {diagType === 'cargas' && (
          <DiagramCargasSVG geo={geo} loadsData={selCombo.loads} tipoBase={geo.tipoBase}
            nodeReactions={selCombo.nodeReactions} />
        )}
        {diagType === 'def' && (
          <DiagramDeformada geo={geo} comboResult={selCombo} tipoBase={geo.tipoBase}
            nodeReactions={showReactions ? selCombo.nodeReactions : null} />
        )}
      </div>

      {/* ── Tabla de reacciones ── */}
      {selCombo.nodeReactions && (
        <ReactionTable nodeReactions={selCombo.nodeReactions} tipoBase={geo.tipoBase} />
      )}

      {/* ── Nota PP perfiles (solo combo D) ── */}
      {(() => {
        const isD = /\bD\b|^B_D$|^C1$/.test(selCombo.id) || selCombo.nombre?.includes('1.4D');
        if (!isD) return null;
        const pCol = result.perfilColumna;
        const pRaf = result.perfilRafter;
        const Lc = result.parametros?.Lcolumna ?? geo.he;
        const Lr = result.parametros?.Lrafter ?? Math.sqrt((geo.B/2)**2 + (geo.hc - geo.he)**2);
        if (!pCol || !pRaf) return null;
        const ppCol = 2 * pCol.peso * 9.81 / 1000 * Lc; // kN, 2 columnas
        const ppRaf = 2 * pRaf.peso * 9.81 / 1000 * Lr; // kN, 2 rafters
        const ppTot = ppCol + ppRaf;
        const nr = selCombo.nodeReactions;
        const sumRy = nr ? ((nr.node0?.Ry || 0) + (nr.node4?.Ry || 0)) : null;
        const factor = /C1/.test(selCombo.id) ? 1.4 : 1.0;
        return (
          <div className="rounded p-2 text-[10px] space-y-1.5"
            style={{ background: `${C.ok}08`, border: `1px solid ${C.ok}25` }}>
            <div className="font-semibold text-xs" style={{ color: C.ok }}>Verificación PP — Peso propio de perfiles</div>
            <table className="w-full font-mono" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: C.dm, borderBottom: `1px solid ${C.bd}` }}>
                  {['Elemento','Perfil','kg/m','L (m)','PP (kN)'].map((h,i) => (
                    <th key={i} className="px-2 py-0.5 text-left" style={{ fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ color: C.tx }}>
                <tr>
                  <td className="px-2 py-0.5">Columnas (×2)</td>
                  <td className="px-2 py-0.5" style={{ color: C.ac }}>{pCol.nombre}</td>
                  <td className="px-2 py-0.5">{pCol.peso}</td>
                  <td className="px-2 py-0.5">{Lc.toFixed(2)}</td>
                  <td className="px-2 py-0.5">{ppCol.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5">Cabriadas (×2)</td>
                  <td className="px-2 py-0.5" style={{ color: C.ac }}>{pRaf.nombre}</td>
                  <td className="px-2 py-0.5">{pRaf.peso}</td>
                  <td className="px-2 py-0.5">{Lr.toFixed(2)}</td>
                  <td className="px-2 py-0.5">{ppRaf.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: `1px solid ${C.bd}`, fontWeight: 'bold' }}>
                  <td className="px-2 py-0.5" colSpan={4} style={{ color: C.ok }}>PP total pórtico</td>
                  <td className="px-2 py-0.5" style={{ color: C.ok }}>{ppTot.toFixed(2)} kN</td>
                </tr>
              </tbody>
            </table>
            {sumRy != null && (
              <div style={{ color: C.dm }}>
                ΣRy (izq+der) = <span style={{ color: C.ok, fontWeight: 'bold' }}>{sumRy.toFixed(2)} kN</span>
                {factor !== 1 && (
                  <span> = ×{factor} × PP_perfiles({(ppTot).toFixed(2)}) ≈ {(factor * ppTot).toFixed(2)} kN (solo PP)</span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Tabla de valores ── */}
      <ValoresExtremos geo={geo} elems={elems} diagType={diagType} comboResult={selCombo} />

      {/* ── Nota metodológica ── */}
      <div className="rounded p-2 text-[10px] space-y-0.5"
        style={{ background: C.cd, border: `1px solid ${C.bd}`, color: C.dm }}>
        <div className="font-semibold" style={{ color: C.ac }}>Metodología</div>
        <div>
          Modelo: pórtico Euler-Bernoulli, rigidez directa.
          {' '}ELU: {combos.filter(c=>(c.group||'elu')==='elu').length} combos ·
          {' '}ELS: {combos.filter(c=>c.group==='els').length} combos ·
          {' '}Básicos: {combos.filter(c=>c.group==='basic').length} casos.
        </div>
        <div>V(x) = −Vi + w·x · · · M(x) = Mi − Vi·x + w·x²/2  donde w = (Vi − Vj) / L</div>
        <div>Deformada: interpolación de Hermite cúbica sobre desplazamientos nodales.</div>
      </div>
    </div>
  );
}

// ─── SVG wrapper para diagrama de cargas ────────────────────────────────────

function DiagramCargasSVG({ geo, loadsData, tipoBase, nodeReactions }) {
  const diagExt = geo.he * 0.28;
  const tx = makeTransform(geo, diagExt);
  const nodes = nodePositions(geo);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block', width: '100%', height: 'auto', background: C.bg }}>

      {/* Cuadrículas — acortadas para no superponerse con flechas de carga */}
      {[0, geo.he, geo.hc].map((y, i) => (
        <line key={i}
          x1={tx.toSvgX(0)} y1={tx.toSvgY(y)}
          x2={tx.toSvgX(geo.B)} y2={tx.toSvgY(y)}
          stroke={C.bd} strokeWidth={0.5} strokeDasharray="3,5" />
      ))}

      {/* Esqueleto del pórtico */}
      <FrameOutline geo={geo} tx={tx} stroke={C.ac} sw={2} />
      {nodes.map(([x, y], i) => (
        <NodeDot key={i} x={x} y={y} tx={tx} fill={C.ac} r={3} />
      ))}

      {/* Flechas de cargas */}
      <DiagramCargas geo={geo} tx={tx} loadsData={loadsData} />

      {/* Flechas de reacciones */}
      <ReactionArrows geo={geo} tx={tx} nodeReactions={nodeReactions} tipoBase={tipoBase} />

      {/* Símbolos de apoyo */}
      {(() => {
        const s = Math.max(8, Math.min(20, tx.toSvgLen(geo.he * 0.07)));
        return tipoBase === 'empotrada' ? (
          <>
            <SupportFixed  sx={tx.toSvgX(0)}     sy={tx.toSvgY(0)} size={s} />
            <SupportFixed  sx={tx.toSvgX(geo.B)} sy={tx.toSvgY(0)} size={s} />
          </>
        ) : (
          <>
            <SupportPinned sx={tx.toSvgX(0)}     sy={tx.toSvgY(0)} size={s} />
            <SupportPinned sx={tx.toSvgX(geo.B)} sy={tx.toSvgY(0)} size={s} />
          </>
        );
      })()}

      {/* Leyenda */}
      <text x={VB_W - 8} y={VB_H - 10} textAnchor="end" fontSize={8.5}
        fontFamily="monospace" fill={C.dm} style={{ userSelect: 'none' }}>
        cargas lineales [kN/m] · sep. de pórticos aplicada
      </text>

      {/* Cotas geometría */}
      <DimensionAnnotations geo={geo} tx={tx} />
    </svg>
  );
}

// ─── Tabla de valores en extremos ──────────────────────────────────────────

function ValoresExtremos({ geo, elems, diagType, comboResult }) {
  if (diagType === 'cargas') return null;
  if (diagType === 'def') {
    const U = comboResult?.displacements;
    if (!U) return null;
    const nombres = ['Base izq', 'Alero izq', 'Cumbrera', 'Alero der', 'Base der'];
    return (
      <div className="rounded overflow-hidden" style={{ border: `1px solid ${C.bd}` }}>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ background: C.sb }}>
              {['Nodo', 'ux [mm]', 'uy [mm]', 'θ [mrad]'].map((h, i) => (
                <th key={i} className="px-2 py-1 text-left"
                  style={{ color: C.dm, fontSize: 10, borderBottom: `1px solid ${C.bd}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nombres.map((nom, i) => (
              <tr key={i} style={{ background: i % 2 ? `${C.cd}80` : 'transparent' }}>
                <td className="px-2 py-0.5" style={{ color: C.dm }}>{nom}</td>
                <td className="px-2 py-0.5" style={{ color: C.tx }}>{(U[i*3]*1000).toFixed(3)}</td>
                <td className="px-2 py-0.5" style={{ color: C.tx }}>{(U[i*3+1]*1000).toFixed(3)}</td>
                <td className="px-2 py-0.5" style={{ color: C.tx }}>{(U[i*3+2]*1000).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const nomElems = ['Col. izq (0→1)', 'Rafter izq (1→2)', 'Rafter der (2→3)', 'Col. der (3→4)'];
  const colVal = v => ({ color: v > 0.01 ? COL_POS : v < -0.01 ? COL_NEG : C.tx });

  return (
    <div className="space-y-2">
      {elems.map((el, e) => {
        const nPts = el.xs.length;
        return (
          <div key={e} className="rounded overflow-hidden" style={{ border: `1px solid ${C.bd}` }}>
            <div className="px-2 py-1 text-xs font-semibold"
              style={{ background: C.sb, color: C.ac, borderBottom: `1px solid ${C.bd}` }}>
              {nomElems[e]}
              <span style={{ color: C.dm, fontWeight: 400 }}>
                {` — L = ${el.L.toFixed(2)} m, θ = ${(el.theta * 180 / Math.PI).toFixed(1)}°`}
              </span>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ background: C.sb, position: 'sticky', top: 0 }}>
                    {['x [m]', 'V [kN]', 'M [kN·m]', 'N [kN]'].map((h, i) => (
                      <th key={i} className="px-2 py-0.5 text-right"
                        style={{ color: C.dm, fontSize: 9, borderBottom: `1px solid ${C.bd}` }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {el.xs.map((x, k) => {
                    const isNode = k === 0 || k === nPts - 1;
                    return (
                      <tr key={k} style={{
                        background: isNode ? `${C.ac}15` : k % 2 ? `${C.cd}80` : 'transparent',
                        fontWeight: isNode ? 600 : 400,
                      }}>
                        <td className="px-2 py-0.5 text-right" style={{ color: C.dm }}>{x.toFixed(2)}</td>
                        <td className="px-2 py-0.5 text-right" style={colVal(el.V[k])}>{el.V[k].toFixed(2)}</td>
                        <td className="px-2 py-0.5 text-right" style={colVal(el.M[k])}>{el.M[k].toFixed(2)}</td>
                        <td className="px-2 py-0.5 text-right" style={colVal(el.N[k])}>{el.N[k].toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
