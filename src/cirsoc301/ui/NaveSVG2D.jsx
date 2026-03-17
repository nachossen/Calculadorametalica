/**
 * NaveSVG2D.jsx — Vista 2D del pórtico tipo (corte transversal)
 *
 * Muestra estructura principal (columnas + cabriadas), correas de techo
 * y correas de pared (girts) con perfil adoptado y separación.
 */
import { C } from '../../ui/common/theme.js';

/**
 * @param {{ geo, perfilCol, perfilRaf, verCol, verRaf, correa }} props
 */
export function NaveSVG2D({ geo, perfilCol, perfilRaf, verCol, verRaf, correa }) {
  const { B, he, hc, tipoBase, sepCorreas, sepGirts } = geo;
  const pad = 50;
  const scale = Math.min(400 / B, 300 / hc);
  const W = B * scale + pad * 2;
  const H = hc * scale + pad * 2 + 30;

  const toX = x => pad + x * scale;
  const toY = y => H - pad - 30 - y * scale;

  // Nodos del pórtico
  const x0 = toX(0), y0 = toY(0);
  const x1 = toX(0), y1 = toY(he);
  const x2 = toX(B / 2), y2 = toY(hc);
  const x3 = toX(B), y3 = toY(he);
  const x4 = toX(B), y4 = toY(0);

  // ── Correas de techo ──
  const Lraf = Math.sqrt((B / 2) ** 2 + (hc - he) ** 2);
  const nCorreas = Math.max(2, Math.round(Lraf / sepCorreas));
  const correasIzq = [];
  const correasDer = [];
  for (let i = 1; i < nCorreas; i++) {
    const t = i / nCorreas;
    correasIzq.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    correasDer.push([x2 + (x3 - x2) * t, y2 + (y3 - y2) * t]);
  }

  // ── Correas de pared (girts) ──
  const nGirts = Math.max(1, Math.round(he / sepGirts));
  const girtsIzq = [];
  const girtsDer = [];
  for (let i = 1; i < nGirts; i++) {
    const t = i / nGirts;
    girtsIzq.push([x0, y0 + (y1 - y0) * t]);
    girtsDer.push([x4, y4 + (y3 - y4) * t]);
  }

  const articulado = tipoBase === 'articulada';
  const girtLen = 6;  // longitud visual del trazo horizontal del girt en px

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 350 }}>
      {/* Fondo */}
      <rect width={W} height={H} fill="transparent" />

      {/* Línea de suelo */}
      <line x1={toX(-1)} y1={toY(0)} x2={toX(B + 1)} y2={toY(0)}
        stroke={C.bd} strokeWidth={2} />
      {/* Hatch suelo */}
      {Array.from({ length: Math.ceil(B / 1.5) + 2 }, (_, i) => {
        const sx = toX(-1 + i * 1.5);
        return <line key={i} x1={sx} y1={toY(0)} x2={sx - 8} y2={toY(0) + 8}
          stroke={C.bd} strokeWidth={1} />;
      })}

      {/* ── Estructura principal (pórtico) ── */}
      <polyline points={`${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
        fill="none" stroke={C.ac} strokeWidth={3} strokeLinejoin="round" />

      {/* ── Correas de techo ── */}
      {[...correasIzq, ...correasDer].map(([cx, cy], i) => {
        // Trazos perpendiculares al faldón
        const isLeft = i < correasIzq.length;
        const dx = isLeft ? (x2 - x1) : (x3 - x2);
        const dy = isLeft ? (y2 - y1) : (y3 - y2);
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len * girtLen;
        const ny = dx / len * girtLen;
        return (
          <g key={`cr-${i}`}>
            <line x1={cx - nx * 0.5} y1={cy - ny * 0.5} x2={cx + nx * 0.5} y2={cy + ny * 0.5}
              stroke="#f59e0b" strokeWidth={1.5} />
            <circle cx={cx} cy={cy} r={2} fill="#f59e0b" />
          </g>
        );
      })}
      {/* Correa en cumbrera */}
      <circle cx={x2} cy={y2} r={2.5} fill="#f59e0b" />
      {/* Correas en aleros */}
      <circle cx={x1} cy={y1} r={2.5} fill="#f59e0b" />
      <circle cx={x3} cy={y3} r={2.5} fill="#f59e0b" />

      {/* ── Correas de pared (girts) ── */}
      {girtsIzq.map(([gx, gy], i) => (
        <g key={`gl-${i}`}>
          <line x1={gx - girtLen * 0.5} y1={gy} x2={gx + girtLen * 0.5} y2={gy}
            stroke="#a78bfa" strokeWidth={1.5} />
          <circle cx={gx} cy={gy} r={2} fill="#a78bfa" />
        </g>
      ))}
      {girtsDer.map(([gx, gy], i) => (
        <g key={`gr-${i}`}>
          <line x1={gx - girtLen * 0.5} y1={gy} x2={gx + girtLen * 0.5} y2={gy}
            stroke="#a78bfa" strokeWidth={1.5} />
          <circle cx={gx} cy={gy} r={2} fill="#a78bfa" />
        </g>
      ))}

      {/* ── Apoyos ── */}
      {articulado ? (
        <>
          <polygon points={`${x0},${y0} ${x0 - 8},${y0 + 12} ${x0 + 8},${y0 + 12}`}
            fill="none" stroke={C.dm} strokeWidth={1.5} />
          <polygon points={`${x4},${y4} ${x4 - 8},${y4 + 12} ${x4 + 8},${y4 + 12}`}
            fill="none" stroke={C.dm} strokeWidth={1.5} />
        </>
      ) : (
        <>
          <rect x={x0 - 10} y={y0} width={20} height={6} fill={C.dm} opacity={0.6} />
          <rect x={x4 - 10} y={y4} width={20} height={6} fill={C.dm} opacity={0.6} />
        </>
      )}

      {/* ── Cotas ── */}
      {/* B (horizontal) */}
      <line x1={x0} y1={toY(-1.2)} x2={x4} y2={toY(-1.2)}
        stroke={C.dm} strokeWidth={0.7} markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x={(x0 + x4) / 2} y={toY(-1.2) - 4} textAnchor="middle"
        fill={C.dm} fontSize={10}>B = {B} m</text>

      {/* he (vertical izq) */}
      <line x1={toX(-1.5)} y1={y0} x2={toX(-1.5)} y2={y1}
        stroke={C.dm} strokeWidth={0.7} />
      <text x={toX(-1.5) - 4} y={(y0 + y1) / 2} textAnchor="end"
        fill={C.dm} fontSize={9} dominantBaseline="middle">he={he}m</text>

      {/* hc (vertical centro) */}
      <line x1={toX(B / 2 + 1)} y1={y0} x2={toX(B / 2 + 1)} y2={y2}
        stroke={C.dm} strokeWidth={0.7} />
      <text x={toX(B / 2 + 1) + 4} y={(y0 + y2) / 2} textAnchor="start"
        fill={C.dm} fontSize={9} dominantBaseline="middle">hc={hc}m</text>

      {/* ── Labels de perfiles — Estructura principal ── */}
      {perfilCol && (
        <>
          <text x={x0 - 5} y={(y0 + y1) / 2 - 8} textAnchor="end"
            fill={C.ac} fontSize={8} fontWeight="bold">{perfilCol.nombre}</text>
          <text x={x0 - 5} y={(y0 + y1) / 2 + 2} textAnchor="end"
            fill={C.dm} fontSize={7}>Columna</text>
          <text x={x4 + 5} y={(y4 + y3) / 2 - 8} textAnchor="start"
            fill={C.ac} fontSize={8} fontWeight="bold">{perfilCol.nombre}</text>
          <text x={x4 + 5} y={(y4 + y3) / 2 + 2} textAnchor="start"
            fill={C.dm} fontSize={7}>Columna</text>
        </>
      )}
      {perfilRaf && (
        <>
          <text x={(x1 + x2) / 2 - 10} y={(y1 + y2) / 2 - 12} textAnchor="middle"
            fill={C.ac} fontSize={8} fontWeight="bold">{perfilRaf.nombre}</text>
          <text x={(x1 + x2) / 2 - 10} y={(y1 + y2) / 2 - 2} textAnchor="middle"
            fill={C.dm} fontSize={7}>Cabriada</text>
        </>
      )}

      {/* ── Labels de correas de techo ── */}
      <text x={(x2 + x3) / 2 + 10} y={(y2 + y3) / 2 - 12} textAnchor="middle"
        fill="#f59e0b" fontSize={7.5} fontWeight="bold">
        {correa ? correa.nombre : 'Correa'}
      </text>
      <text x={(x2 + x3) / 2 + 10} y={(y2 + y3) / 2 - 3} textAnchor="middle"
        fill={C.dm} fontSize={7}>
        sep={sepCorreas.toFixed(1)} m
      </text>

      {/* ── Labels de correas de pared ── */}
      {girtsIzq.length > 0 && (
        <>
          <text x={x0 + 15} y={girtsIzq[Math.floor(girtsIzq.length / 2)][1] - 8}
            textAnchor="start" fill="#a78bfa" fontSize={7.5} fontWeight="bold">
            Girts
          </text>
          <text x={x0 + 15} y={girtsIzq[Math.floor(girtsIzq.length / 2)][1] + 2}
            textAnchor="start" fill={C.dm} fontSize={7}>
            sep={sepGirts.toFixed(1)} m
          </text>
        </>
      )}

      {/* ── Ratios H1 ── */}
      {verCol && (
        <text x={x0 + 15} y={(y0 + y1) / 2 + 20} textAnchor="start"
          fill={verCol.pasa ? C.ok : C.pos} fontSize={8}>
          H1={verCol.ratioH1.toFixed(2)}
        </text>
      )}
      {verRaf && (
        <text x={(x1 + x2) / 2 + 10} y={(y1 + y2) / 2 + 12} textAnchor="start"
          fill={verRaf.pasa ? C.ok : C.pos} fontSize={8}>
          H1={verRaf.ratioH1.toFixed(2)}
        </text>
      )}

      {/* Ángulo θ */}
      <text x={x1 + 20} y={y1 - 5} textAnchor="start" fill={C.w} fontSize={8}>
        θ = {(Math.atan2(hc - he, B / 2) * 180 / Math.PI).toFixed(1)}°
      </text>

      {/* Badge tipo base */}
      <rect x={W - 100} y={5} width={90} height={18} rx={4}
        fill={articulado ? '#3b82f620' : '#ef444420'}
        stroke={articulado ? '#3b82f6' : '#ef4444'} strokeWidth={0.7} />
      <text x={W - 55} y={17} textAnchor="middle"
        fill={articulado ? '#3b82f6' : '#ef4444'} fontSize={8} fontWeight="bold">
        {articulado ? 'ARTICULADA' : 'EMPOTRADA'}
      </text>

      {/* Defs */}
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="none" stroke={C.dm} strokeWidth={0.7} />
        </marker>
      </defs>
    </svg>
  );
}
