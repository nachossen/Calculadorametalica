/**
 * NaveSVG3D.jsx — Vista 3D interactiva de la nave industrial
 * Drag para rotar, scroll para zoom. Muestra arriostramientos.
 */
import { useRef, useState } from 'react';
import { C } from '../../ui/common/theme.js';

const MAG = '#e879f9'; // magenta — puntales int.col. + correas dobles + tornapuntas

// ── Algoritmo de arriostramientos ────────────────────────────────────────────
function bracingInfo(nPorticos, sep, he) {
  if (nPorticos < 2) return { positions: [], needsIntermediate: false, mensaje: '' };
  const distMax  = Math.min(5 * he, 30);
  const vanosMax = Math.max(1, Math.floor(distMax / sep));
  const positions = new Set([0, nPorticos - 2]);
  for (let v = vanosMax; v < nPorticos - 1; v += vanosMax) positions.add(v);
  const sorted = [...positions].sort((a, b) => a - b);
  return {
    positions: sorted,
    needsIntermediate: sorted.length > 2,
    vanosMax,
    distMax,
    mensaje: sorted.length > 2
      ? `Arriostramientos intermedios recomendados cada ${vanosMax} vano${vanosMax > 1 ? 's' : ''} (dist. máx. ≈ ${distMax.toFixed(0)} m)`
      : '',
  };
}

/**
 * @param {{ geo, perfilCol, perfilRaf }} props
 */
export function NaveSVG3D({ geo, perfilCol, perfilRaf }) {
  const { B, L, he, hc, nPorticos,
          arriostRafterInf = 'ninguno', arriostRafterInfCustom,
          arriostCol = 'ninguno', arriostColCustom = 0 } = geo;

  const [rY, setRY] = useState(30);
  const [rX, setRX] = useState(22);
  const [zoom, setZoom] = useState(1);
  const dragging = useRef(false);
  const lastPos  = useRef({ x: 0, y: 0 });

  const W = 520, H = 360;
  const sep = L / (nPorticos - 1);

  const footprintDiag = Math.sqrt((B / 2) ** 2 + (L / 2) ** 2);
  const maxDim = Math.max(footprintDiag, hc + 2);
  const sc = (Math.min(W, H) * 0.36 / maxDim) * zoom;

  const cx3d = B / 2;
  const cy3d = L / 2;
  const cz3d = hc * 0.45;

  const cAz = Math.cos(rY * Math.PI / 180), sAz = Math.sin(rY * Math.PI / 180);
  const cEl = Math.cos(rX * Math.PI / 180), sEl = Math.sin(rX * Math.PI / 180);

  const pr = (x, y, z) => {
    const dx = x - cx3d, dy = y - cy3d, dz = z - cz3d;
    const x1 =  dx * cAz - dy * sAz;
    const y1 =  dx * sAz + dy * cAz;
    const screenX = x1;
    const screenZ = y1 * sEl + dz * cEl;
    return {
      x: W / 2 + screenX * sc,
      y: H / 2 - screenZ * sc,
    };
  };
  const pt = (x, y, z) => { const p = pr(x, y, z); return `${p.x},${p.y}`; };

  const onMouseDown = e => { dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = e => {
    if (!dragging.current) return;
    setRY(r => r + (e.clientX - lastPos.current.x) * 0.5);
    setRX(r => Math.max(5, Math.min(75, r - (e.clientY - lastPos.current.y) * 0.5)));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp   = () => { dragging.current = false; };
  const onWheel     = e => { e.preventDefault(); setZoom(z => Math.max(0.4, Math.min(3, z - e.deltaY * 0.0008))); };
  const onTouchStart = e => {
    if (e.touches.length === 1) { dragging.current = true; lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  };
  const onTouchMove = e => {
    if (!dragging.current || e.touches.length !== 1) return;
    setRY(r => r + (e.touches[0].clientX - lastPos.current.x) * 0.5);
    setRX(r => Math.max(5, Math.min(75, r - (e.touches[0].clientY - lastPos.current.y) * 0.5)));
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = () => { dragging.current = false; };

  // ── Geometría ─────────────────────────────────────────────────────────────
  const Lraf = Math.sqrt((B / 2) ** 2 + (hc - he) ** 2);
  const bracing  = bracingInfo(nPorticos, sep, he);

  // Tornapuntas (arriostramiento ala inferior rafter)
  const tornapuntaFracs = [];
  if (arriostRafterInf === 'mitad') {
    tornapuntaFracs.push(0.5);
  } else if (arriostRafterInf === 'tercios') {
    tornapuntaFracs.push(1/3, 2/3);
  } else if (arriostRafterInf === 'custom' && arriostRafterInfCustom > 0) {
    const n = Math.max(1, Math.round(Lraf / arriostRafterInfCustom) - 1);
    for (let i = 1; i <= n; i++) tornapuntaFracs.push(i / (n + 1));
  }

  // Puntales int. col. (girts) — solo posiciones que realmente arriostran
  const girtZPositions = [];
  switch (arriostCol) {
    case 'mitad':   girtZPositions.push(he / 2); break;
    case 'tercios': girtZPositions.push(he / 3, (2 * he) / 3); break;
    case 'custom': {
      const sp = arriostColCustom > 0 ? arriostColCustom : he;
      for (let z = sp; z < he - 0.01; z += sp) girtZPositions.push(z);
      break;
    }
    default: break; // 'ninguno'
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Girts en las 4 caras
  const girtsLines = [];
  girtZPositions.forEach((z, idx) => {
    const zk = `${idx}_${z.toFixed(2)}`;
    const gl0 = pr(0, 0, z); const gl1 = pr(0, L, z);
    const gr0 = pr(B, 0, z); const gr1 = pr(B, L, z);
    const gf0 = pr(0, 0, z); const gf1 = pr(B, 0, z);
    const gb0 = pr(0, L, z); const gb1 = pr(B, L, z);
    girtsLines.push(
      <line key={`gl${zk}`} x1={gl0.x} y1={gl0.y} x2={gl1.x} y2={gl1.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />,
      <line key={`gr${zk}`} x1={gr0.x} y1={gr0.y} x2={gr1.x} y2={gr1.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />,
      <line key={`gf${zk}`} x1={gf0.x} y1={gf0.y} x2={gf1.x} y2={gf1.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />,
      <line key={`gb${zk}`} x1={gb0.x} y1={gb0.y} x2={gb1.x} y2={gb1.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />,
    );
  });

  // Correas dobles (cumbrera + alero)
  const correasDobles = [];
  { const p0 = pr(0,   0, he); const p1 = pr(0,   L, he);
    correasDobles.push(<line key="eaveL" x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />); }
  { const p0 = pr(B,   0, he); const p1 = pr(B,   L, he);
    correasDobles.push(<line key="eaveR" x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />); }
  { const p0 = pr(B/2, 0, hc); const p1 = pr(B/2, L, hc);
    correasDobles.push(<line key="ridge" x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />); }

  // Tornapuntas
  const viguetasPuntal = [];
  tornapuntaFracs.forEach((t, i) => {
    const xL  = (B / 2) * t;
    const zL  = he + (hc - he) * t;
    const xR  = B - xL;
    const p0L = pr(xL, 0, zL); const p1L = pr(xL, L, zL);
    const p0R = pr(xR, 0, zL); const p1R = pr(xR, L, zL);
    viguetasPuntal.push(
      <line key={`vpl${i}`} x1={p0L.x} y1={p0L.y} x2={p1L.x} y2={p1L.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />,
      <line key={`vpr${i}`} x1={p0R.x} y1={p0R.y} x2={p1R.x} y2={p1R.y} stroke={MAG} strokeWidth={2.0} opacity={0.9} />,
    );
  });

  // Pórticos
  const porticos = [];
  for (let i = 0; i < nPorticos; i++) {
    const y = i * sep;
    const isBorder = i === 0 || i === nPorticos - 1;
    porticos.push(
      <polyline key={`por${i}`}
        points={`${pt(0, y, 0)} ${pt(0, y, he)} ${pt(B/2, y, hc)} ${pt(B, y, he)} ${pt(B, y, 0)}`}
        fill="none" stroke={C.ac} strokeWidth={isBorder ? 2.2 : 1.4} opacity={0.9} />
    );
  }

  // Soleras
  const soleraElems = [
    <line key="sl1" x1={pr(0,0,0).x} y1={pr(0,0,0).y} x2={pr(0,L,0).x} y2={pr(0,L,0).y} stroke={`${C.ac}55`} strokeWidth={1.0} />,
    <line key="sl2" x1={pr(B,0,0).x} y1={pr(B,0,0).y} x2={pr(B,L,0).x} y2={pr(B,L,0).y} stroke={`${C.ac}55`} strokeWidth={1.0} />,
  ];

  // Arriostramientos Cruz de San Andrés
  const arriostramientos = [];
  bracing.positions.forEach(vano => {
    const y0 = vano * sep;
    const y1 = (vano + 1) * sep;
    const isIntermediate = vano !== 0 && vano !== nPorticos - 2;
    const color = isIntermediate ? C.w : C.ok;
    const opacity = isIntermediate ? 0.65 : 0.6;
    const dash = isIntermediate ? '5 4' : undefined;

    const lp0 = pr(0, y0, 0); const lp1 = pr(0, y1, he);
    const lp2 = pr(0, y1, 0); const lp3 = pr(0, y0, he);
    arriostramientos.push(
      <g key={`bl${vano}`} opacity={opacity}>
        <line x1={lp0.x} y1={lp0.y} x2={lp1.x} y2={lp1.y} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
        <line x1={lp2.x} y1={lp2.y} x2={lp3.x} y2={lp3.y} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
      </g>
    );
    const rp0 = pr(B, y0, 0); const rp1 = pr(B, y1, he);
    const rp2 = pr(B, y1, 0); const rp3 = pr(B, y0, he);
    arriostramientos.push(
      <g key={`br${vano}`} opacity={opacity}>
        <line x1={rp0.x} y1={rp0.y} x2={rp1.x} y2={rp1.y} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
        <line x1={rp2.x} y1={rp2.y} x2={rp3.x} y2={rp3.y} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
      </g>
    );
    const tl0 = pr(0,   y0, he); const tl1 = pr(B/2, y1, hc);
    const tl2 = pr(0,   y1, he); const tl3 = pr(B/2, y0, hc);
    const tr0 = pr(B/2, y0, hc); const tr1 = pr(B,   y1, he);
    const tr2 = pr(B/2, y1, hc); const tr3 = pr(B,   y0, he);
    arriostramientos.push(
      <g key={`tl${vano}`} opacity={opacity * 0.9}>
        <line x1={tl0.x} y1={tl0.y} x2={tl1.x} y2={tl1.y} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
        <line x1={tl2.x} y1={tl2.y} x2={tl3.x} y2={tl3.y} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
      </g>,
      <g key={`tr${vano}`} opacity={opacity * 0.9}>
        <line x1={tr0.x} y1={tr0.y} x2={tr1.x} y2={tr1.y} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
        <line x1={tr2.x} y1={tr2.y} x2={tr3.x} y2={tr3.y} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
      </g>,
    );
  });

  const roofL = [pt(0,0,he), pt(B/2,0,hc), pt(B/2,L,hc), pt(0,L,he)].join(' ');
  const roofR = [pt(B/2,0,hc), pt(B,0,he), pt(B,L,he), pt(B/2,L,hc)].join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-grab active:cursor-grabbing select-none"
        style={{ maxHeight: 360 }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Vigas de solera */}
        {soleraElems}

        {/* Cubierta */}
        <polygon points={roofL} fill={C.ac} opacity={0.05} stroke={C.ac} strokeWidth={0.5} />
        <polygon points={roofR} fill={C.ac} opacity={0.03} stroke={C.ac} strokeWidth={0.5} />

        {/* Puntales int. col. (girts en posiciones arriostCol) */}
        {girtsLines}

        {/* Arriostramientos Cruz de San Andrés */}
        {arriostramientos}

        {/* Correas dobles: cumbrera + alero */}
        {correasDobles}

        {/* Tornapuntas (vigas puntal) */}
        {viguetasPuntal}

        {/* Pórticos */}
        {porticos}

        {/* Labels perfiles */}
        {perfilCol && (() => {
          const p = pr(-1, 0, he / 2);
          return <text x={p.x - 4} y={p.y} textAnchor="end" fill={C.ok} fontSize={7} fontWeight="bold" fontFamily="monospace">{perfilCol.nombre}</text>;
        })()}
        {perfilRaf && (() => {
          const p = pr(B / 4, -1, (he + hc) / 2);
          return <text x={p.x} y={p.y - 4} textAnchor="middle" fill={C.ok} fontSize={7} fontWeight="bold" fontFamily="monospace">{perfilRaf.nombre}</text>;
        })()}

        {/* Cotas */}
        {(() => {
          const pB  = pr(B / 2, -2, 0);
          const pL  = pr(-2, L / 2, 0);
          const phe = pr(-1.5, 0, he / 2);
          const s   = { fill: C.dm, fontSize: 9, fontFamily: 'monospace' };
          return (
            <>
              <text x={pB.x}  y={pB.y}  textAnchor="middle" {...s}>B={B}m</text>
              <text x={pL.x}  y={pL.y}  textAnchor="end"    {...s}>L={L}m</text>
              <text x={phe.x} y={phe.y} textAnchor="end"    {...s}>he={he}m</text>
            </>
          );
        })()}

        {/* Sep pórticos */}
        {(() => {
          const p = pr(B + 1.5, sep / 2, 0);
          return <text x={p.x} y={p.y} textAnchor="start" fill={C.dm} fontSize={8} fontFamily="monospace">sep={sep.toFixed(1)}m</text>;
        })()}

        {/* N pórticos */}
        {(() => {
          const p = pr(B + 1.5, L / 2, 0);
          return <text x={p.x} y={p.y + 12} textAnchor="start" fill={C.dm} fontSize={8} fontFamily="monospace">{nPorticos} pórticos</text>;
        })()}

        {/* Leyenda */}
        <g>
          {girtZPositions.length > 0 && <>
            <line x1={10} y1={H - 48} x2={24} y2={H - 48} stroke={MAG} strokeWidth={2.0} opacity={0.9} />
            <text x={27} y={H - 44} fill={MAG} fontSize={8} fontFamily="monospace">Puntal int. col. ({arriostCol})</text>
          </>}
          <line x1={10} y1={H - 36} x2={24} y2={H - 36} stroke={C.ok} strokeWidth={1.5} />
          <text x={27} y={H - 32} fill={C.ok} fontSize={8} fontFamily="monospace">Arriostramiento (pared+techo)</text>
          <line x1={10} y1={H - 24} x2={24} y2={H - 24} stroke={MAG} strokeWidth={2.0} />
          <text x={27} y={H - 20} fill={MAG} fontSize={8} fontFamily="monospace">
            {tornapuntaFracs.length > 0 ? 'Correa doble / viga puntal' : 'Correa doble (cumbrera/alero)'}
          </text>
          {bracing.needsIntermediate && <>
            <line x1={10} y1={H - 12} x2={24} y2={H - 12} stroke={C.w} strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={27} y={H - 8} fill={C.w} fontSize={8} fontFamily="monospace">Arriostr. intermedio recom.</text>
          </>}
        </g>

        <text x={W - 8} y={H - 5} fill={C.dm} fontSize={7} textAnchor="end" fontFamily="monospace">
          Rotar: arrastrar | Zoom: scroll
        </text>
      </svg>

      {bracing.needsIntermediate && (
        <div className="mt-1 px-3 py-1.5 rounded text-xs flex items-start gap-2"
          style={{ background: `${C.w}15`, border: `1px solid ${C.w}40`, color: C.w }}>
          <span className="font-bold shrink-0">⚠</span>
          <span>{bracing.mensaje}</span>
        </div>
      )}
    </div>
  );
}
