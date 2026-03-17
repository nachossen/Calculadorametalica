/**
 * ui/tabs/TabMemoria.jsx — Memoria de cálculo profesional
 * Formato: fórmula simbólica → sustitución → resultado
 */

import { Badge } from '../common/Badge.jsx';
import { C } from '../common/theme.js';
import { CirsocImg } from '../common/CirsocImg.jsx';

/* ── helpers ── */
const Sym = ({ children }) => (
  <div className="text-xs italic mt-1" style={{ color: C.dm }}>{children}</div>
);
const Sub = ({ children }) => (
  <div className="text-xs font-mono mt-0.5" style={{ color: C.tx }}>{children}</div>
);
const Res = ({ children, color }) => (
  <div className="text-sm font-mono font-bold mt-0.5" style={{ color: color || C.ac }}>{children}</div>
);
const MiniTable = ({ heads, rows, accent }) => (
  <table className="w-full mt-1 text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
    <thead>
      <tr>{heads.map((h, i) => (
        <th key={i} className="text-left px-2 py-1" style={{ color: C.dm, borderBottom: `1px solid ${C.bd}`, fontSize: 10 }}>{h}</th>
      ))}</tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i}>{row.map((cell, j) => (
          <td key={j} className="px-2 py-0.5" style={{
            color: cell.c || C.tx,
            fontWeight: cell.b ? 'bold' : 'normal',
            borderBottom: `1px solid ${C.bd}`,
            fontSize: 11,
          }}>{cell.v ?? cell}</td>
        ))}</tr>
      ))}
    </tbody>
  </table>
);

function StepCard({ n, title, refText, color, children, link, linkLabel, goTab }) {
  return (
    <div className="rounded overflow-hidden" style={{ background: C.cd, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${color}` }}>
      <div className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold" style={{ color: C.tx }}>Paso {n} — {title}</span>
          <Badge color={color}>{refText}</Badge>
        </div>
        {children}
        {link && goTab && (
          <div className="mt-1.5">
            <button onClick={() => goTab(link)} className="text-xs font-mono underline hover:opacity-80" style={{ color }}>
              {linkLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TabMemoria({ r, goTab }) {
  const ff = r.frameForces;
  const gc = r.gcpi;

  return (
    <div className="space-y-2 max-w-3xl">

      {/* Paso 1 — Velocidad */}
      <StepCard n={1} title="Velocidad Básica V" refText="Figs. 1.5-1" color={C.ac}>
        <Sym>V según localidad y categoría de riesgo (Figuras 1.5-1 a 1.5-3)</Sym>
        <Sub>Localidad: {r.localidad || 'Valor personalizado'}</Sub>
        {r.localidad && <Sub>Categoría de riesgo: {r.structKey}</Sub>}
        <Res>V = {r.V} m/s</Res>
      </StepCard>

      {/* Paso 2 — Kd */}
      <StepCard n={2} title="Factor de Direccionalidad Kd" refText="Tabla 1.6-1" color={C.ac}>
        <Sym>Kd según tipo de estructura y superficie</Sym>
        <Sub>Tipo: {r.structKey}</Sub>
        <Res>Kd = {r.Kd}</Res>
      </StepCard>

      {/* Paso 3 — Ke */}
      <StepCard n={3} title="Factor de Elevación Ke" refText="Tabla 1.12-1" color="#8b5cf6">
        <Sym>Ke = e^(−0,000118 · z_s) — interpolación exponencial Tabla 1.12-1</Sym>
        <Sub>z_s = {r.altitude} m s.n.m.</Sub>
        <Sub>= e^(−0,000118 × {r.altitude}) = e^({(-0.000118 * r.altitude).toFixed(4)})</Sub>
        <Res color="#8b5cf6">Ke = {r.Ke.toFixed(4)}</Res>
      </StepCard>

      {/* Paso 4 — Kzt */}
      <StepCard n={4} title="Factor Topográfico Kzt" refText="Fig. 1.8-1" color="#8b5cf6">
        <Sym>Kzt = (1 + K1 · K2 · K3)²</Sym>
        {r.topoType === 'Plano' ? (
          <>
            <Sub>Terreno plano → K1 = K2 = K3 = 0</Sub>
            <Res color="#8b5cf6">Kzt = 1.0000</Res>
          </>
        ) : (
          <>
            <Sub>Tipo: {r.topoType} | H/Lh = {r.HLh.toFixed(3)}{r.HLh >= 0.5 ? ' (≥0.5 → usar 0.5, Lh=2H)' : ''}</Sub>
            <MiniTable
              heads={['Factor', 'Valor', 'Definición']}
              rows={[
                [{ v: 'K1', b: true }, { v: r.K1.toFixed(4), b: true, c: '#8b5cf6' },
                 { v: 'Factor de forma topográfica; f(H/Lh, tipo terreno). Fig. 1.8-1' }],
                [{ v: 'K2', b: true }, { v: r.K2.toFixed(4), b: true, c: '#8b5cf6' },
                 { v: `Distancia horizontal; f(x/Lh=${r.xLh.toFixed(3)}). Fig. 1.8-1` }],
                [{ v: 'K3', b: true }, { v: r.K3.toFixed(4), b: true, c: '#8b5cf6' },
                 { v: `Atenuación con altura; f(z/Lh=${r.zLh.toFixed(3)}). Fig. 1.8-1` }],
              ]}
            />
            <Sym>= (1 + {r.K1.toFixed(4)} × {r.K2.toFixed(4)} × {r.K3.toFixed(4)})²</Sym>
            <Res color="#8b5cf6">Kzt = {r.Kzt.toFixed(4)}</Res>
          </>
        )}
      </StepCard>

      {/* Paso 5 — Geometría */}
      <StepCard n={5} title="Geometría del Edificio" refText="Sec. 1.3" color={C.w}>
        <Sym>θ = atan[(hc − he) / (B/2)]</Sym>
        <Sub>= atan[({r.hc} − {r.he}) / ({r.B}/2)] = {r.theta.toFixed(2)}°</Sub>
        {r.theta < 10 ? (
          <>
            <Sym>θ {'<'} 10° → cubierta prácticamente plana → h = he (Sec. 1.3, CIRSOC 102-2025)</Sym>
            <Sub>h = he = {r.he} m</Sub>
          </>
        ) : (
          <>
            <Sym>θ ≥ 10° → h = (he + hc) / 2 (altura media del techo)</Sym>
            <Sub>= ({r.he} + {r.hc}) / 2 = {r.h.toFixed(2)} m</Sub>
          </>
        )}
        <Res color={C.w}>h = {r.h.toFixed(2)} m | θ = {r.theta.toFixed(1)}°</Res>
        <Sub>Viento: {r.windAngle}° → {r.isNorm ? 'Normal' : 'Paralelo'} a cumbrera</Sub>
        <Sub>Beff = {r.Beff} m | Leff = {r.Leff} m | L/B = {r.LB.toFixed(2)} | h/L = {r.hOverL.toFixed(3)}</Sub>
      </StepCard>

      {/* Paso 6 — Kz */}
      <StepCard n={6} title="Coeficiente de Exposición Kz" refText="Tabla 1.13-1" color={C.ok}>
        <Sym>Kz interpolado de Tabla 1.13-1, evaluado a z = h</Sym>
        <Sub>Exposición {r.exp}, z = h = {r.h.toFixed(2)} m</Sub>
        <Res color={C.ok}>Kz = {r.Kz_h.toFixed(4)}</Res>
      </StepCard>

      {/* Paso 7 — qh (desarrollo completo) */}
      <StepCard n={7} title="Presión Dinámica qh" refText="Ec. 1.10-1" color={C.pos}>
        <Sym>qh = 0.613 · Kz · Kzt · Kd · Ke · V²</Sym>
        <Sub>= 0.613 × {r.Kz_h.toFixed(4)} × {r.Kzt.toFixed(4)} × {r.Kd} × {r.Ke.toFixed(4)} × {r.V}²</Sub>
        <Sub>= 0.613 × {r.Kz_h.toFixed(4)} × {r.Kzt.toFixed(4)} × {r.Kd} × {r.Ke.toFixed(4)} × {(r.V * r.V).toFixed(0)}</Sub>
        <Sub>= {(0.613 * r.Kz_h * r.Kzt * r.Kd * r.Ke).toFixed(4)} × {(r.V * r.V).toFixed(0)}</Sub>
        <Res color={C.pos}>qh = {r.qh.toFixed(2)} Pa</Res>
      </StepCard>

      {/* Paso 8 — G (detallado si flexible) */}
      <StepCard n={8} title="Factor de Efecto de Ráfaga G" refText="Sec. 1.9.3" color={C.ok}>
        <Sub>n₁ = {r.n1.toFixed(2)} Hz → {r.isRigid ? 'RÍGIDA (n₁ ≥ 1 Hz)' : 'FLEXIBLE (n₁ < 1 Hz)'}</Sub>
        {r.isRigid ? (
          <>
            <Sym>Estructura rígida → G = 0.85 (Sec. 1.9.3.1)</Sym>
            <Sym>Nota: el cálculo detallado de G por Ec. 1.9-2 da G = {r.G?.toFixed ? ((0.925 * (1 + 1.7 * 3.4 * r.Iz * r.Q) / (1 + 1.7 * 3.4 * r.Iz))).toFixed(4) : '—'}, se usa 0.85 por ser rígida.</Sym>
            <Res color={C.ok}>G = 0.85</Res>
            <div className="mt-1.5 pt-1.5" style={{ borderTop: `1px dashed ${C.bd}` }}>
              <Sub style={{ color: C.dm }}>Desarrollo intermedio (informativo):</Sub>
              <Sym>z̄ = max(0.6·h, zmin) = max(0.6×{r.h.toFixed(2)}, zmin) = {r.z_bar.toFixed(2)} m</Sym>
              <Sym>Iz = c·(10/z̄)^(1/6) = {r.Iz.toFixed(4)}</Sym>
              <Sym>Lz = l·(z̄/10)^ε̄ = {r.Lz.toFixed(1)} m</Sym>
              <Sym>Q² = 1/[1 + 0.63·((B+h)/Lz)^0.63] = 1/[1 + 0.63·(({r.Beff}+{r.h.toFixed(2)})/{r.Lz.toFixed(1)})^0.63] = {r.Q2.toFixed(4)}</Sym>
              <Sym>Q = √Q² = {r.Q.toFixed(4)}</Sym>
            </div>
          </>
        ) : (
          <>
            <Sym>G calculado por Ec. 1.9-2 (estructura flexible)</Sym>
            <Sym>z̄ = max(0.6·h, zmin) = max(0.6×{r.h.toFixed(2)}, zmin) = {r.z_bar.toFixed(2)} m</Sym>
            <MiniTable
              heads={['Parámetro', 'Fórmula / Sustitución', 'Valor']}
              rows={[
                [{ v: 'Iz', b: true }, { v: `c·(10/z̄)^(1/6) — Ec. 1.9-7` }, { v: r.Iz.toFixed(4), b: true, c: C.ok }],
                [{ v: 'Lz', b: true }, { v: `l·(z̄/10)^ε̄ — Ec. 1.9-9` }, { v: r.Lz.toFixed(1) + ' m', b: true, c: C.ok }],
                [{ v: 'Q²', b: true }, { v: `1/[1+0.63·((${r.Beff}+${r.h.toFixed(1)})/${r.Lz.toFixed(1)})^0.63]` }, { v: r.Q2.toFixed(4), b: true, c: C.ok }],
                [{ v: 'Q', b: true }, { v: '√Q²' }, { v: r.Q.toFixed(4), b: true, c: C.ok }],
                [{ v: 'gQ', b: true }, { v: 'Factor pico = 3.4' }, { v: r.gq.toFixed(1), b: true, c: C.ok }],
              ]}
            />
            <Sym>G = 0.925 × (1 + 1.7×{r.gq.toFixed(1)}×{r.Iz.toFixed(4)}×{r.Q.toFixed(4)}) / (1 + 1.7×3.4×{r.Iz.toFixed(4)})</Sym>
            <Sub>= 0.925 × (1 + {(1.7 * r.gq * r.Iz * r.Q).toFixed(4)}) / (1 + {(1.7 * 3.4 * r.Iz).toFixed(4)})</Sub>
            <Sub>= 0.925 × {(1 + 1.7 * r.gq * r.Iz * r.Q).toFixed(4)} / {(1 + 1.7 * 3.4 * r.Iz).toFixed(4)}</Sub>
            <Res color={C.ok}>G = {r.G.toFixed(4)}</Res>
          </>
        )}
      </StepCard>

      {/* Paso 9 — Cerramiento */}
      <StepCard n={9} title="Clasificación de Cerramiento" refText="Tabla 1.11-1" color={C.w}>
        <Sym>GCpi según clasificación de cerramiento (Sec. 1.11)</Sym>
        <Sub>Clasificación: {r.enclosure}</Sub>
        <Res color={C.w}>GCpi = ±{gc.p}</Res>
      </StepCard>

      {/* Paso 10 — Cp (tabla) */}
      <StepCard n={10} title="Coeficientes de Presión Cp" refText="Figura 2.4-1" color="#8b5cf6" link="tab" linkLabel="→ Ver Tablas CIRSOC" goTab={goTab}>
        <Sym>Modo: Viento {r.roofMode === 'normal' ? 'Normal' : 'Paralelo'} a Cumbrera</Sym>
        <Sub>θ = {r.theta.toFixed(1)}° | h/L = {r.hOverL.toFixed(3)} | L/B = {r.LB.toFixed(2)}</Sub>
        <div className="mt-1 p-1.5 rounded text-xs" style={{ background: C.bg, border: `1px solid ${C.bd}`, color: C.dm }}>
          Paredes: Cp BV = +0.80 (constante); Cp SV interpolado de Fig. 2.4-1 según L/B = {r.LB.toFixed(2)}.
          Lateral: Cp = −0.7 (constante).
          Cubierta: interpolado según θ = {r.theta.toFixed(1)}° y h/L = {r.hOverL.toFixed(3)} de Fig. 2.4-1.
        </div>
        <MiniTable
          heads={['Superficie', 'Cp', 'Parámetro de entrada', 'Referencia']}
          rows={[
            [{ v: `${r.wl.ww} — Barlovento`, b: true }, { v: `+${r.cpWW}`, b: true, c: C.pos }, { v: 'Constante' }, { v: 'Fig. 2.4-1' }],
            [{ v: `${r.wl.lw} — Sotavento`, b: true }, { v: r.cpLW.toFixed(2), b: true, c: C.neg }, { v: `L/B = ${r.LB.toFixed(2)}` }, { v: 'Fig. 2.4-1' }],
            [{ v: 'Lateral', b: true }, { v: r.cpLat.toFixed(1), b: true, c: C.neg }, { v: 'Constante' }, { v: 'Fig. 2.4-1' }],
            [{ v: 'Cubierta BV (max)', b: true }, { v: r.cpRBV?.max?.toFixed(2) ?? '—', b: true, c: (r.cpRBV?.max ?? 0) >= 0 ? C.pos : C.neg }, { v: `θ=${r.theta.toFixed(1)}°, h/L=${r.hOverL.toFixed(3)}` }, { v: 'Fig. 2.4-1' }],
            [{ v: 'Cubierta BV (min)', b: true }, { v: r.cpRBV?.min?.toFixed(2) ?? '—', b: true, c: C.neg }, { v: `θ=${r.theta.toFixed(1)}°, h/L=${r.hOverL.toFixed(3)}` }, { v: 'Fig. 2.4-1' }],
            [{ v: 'Cubierta SV', b: true }, { v: typeof r.cpRSV === 'number' ? r.cpRSV.toFixed(2) : '—', b: true, c: C.neg }, { v: `θ=${r.theta.toFixed(1)}°` }, { v: 'Fig. 2.4-1' }],
          ]}
        />
      </StepCard>

      {/* Referencia CIRSOC: Fig 2.4-1 Cp */}
      <CirsocImg src="/cirsoc/image9.png" alt="Fig 2.4-1 Cp paredes y cubiertas" title="Referencia: Fig. 2.4-1 — Cp paredes y cubiertas (diagramas)" />
      <CirsocImg src="/cirsoc/image10.png" alt="Fig 2.4-1 Cp tablas numéricas" title="Referencia: Fig. 2.4-1 — Cp tablas numéricas (valores)" />

      {/* Paso 11 — Presiones (tabla detallada) */}
      <StepCard n={11} title="Presiones de Diseño" refText="Ec. 2.4-1" color={C.pos} link="main" linkLabel="→ Ver Resumen" goTab={goTab}>
        <Sym>p = q·G·Cp − qh·(±GCpi)</Sym>
        <Sub>G = {r.G.toFixed(4)} | qh = {r.qh.toFixed(2)} Pa | GCpi = ±{gc.p}</Sub>
        <Sub>qh·GCpi = {r.qh.toFixed(2)} × {gc.p} = {(r.qh * gc.p).toFixed(1)} Pa</Sub>

        {/* Desarrollo por superficie */}
        {[
          { lb: `${r.wl.ww} — Barlovento`, cp: r.cpWW, p: r.pWW },
          { lb: `${r.wl.lw} — Sotavento`, cp: r.cpLW, p: r.pLW },
          { lb: 'Lateral', cp: r.cpLat, p: r.pLat },
          { lb: 'Cub. BV (Cp max)', cp: typeof r.cpRBV === 'object' ? r.cpRBV.max : r.cpRBV, p: r.pRBVmax },
          { lb: 'Cub. BV (Cp min)', cp: typeof r.cpRBV === 'object' ? r.cpRBV.min : r.cpRBV, p: r.pRBVmin },
          { lb: 'Cubierta SV', cp: typeof r.cpRSV === 'number' ? r.cpRSV : (r.cpRSV?.min ?? 0), p: r.pRSV },
        ].map((s, i) => {
          const qGCp = r.qh * r.G * s.cp;
          const qGCpi = r.qh * gc.p;
          return (
            <div key={i} className="mt-1 p-1.5 rounded" style={{ background: C.bg, border: `1px solid ${C.bd}` }}>
              <div className="text-xs font-bold mb-0.5" style={{ color: C.tx }}>{s.lb} — Cp = {typeof s.cp === 'number' ? s.cp.toFixed(2) : '—'}</div>
              <div className="text-xs font-mono" style={{ color: C.dm }}>
                q·G·Cp = {r.qh.toFixed(2)} × {r.G.toFixed(4)} × {typeof s.cp === 'number' ? `(${s.cp >= 0 ? '+' : ''}${s.cp.toFixed(2)})` : '—'} = {qGCp.toFixed(1)} Pa
              </div>
              <div className="text-xs font-mono" style={{ color: C.dm }}>
                p+ = {qGCp.toFixed(1)} − ({gc.n}) × {r.qh.toFixed(1)} = {qGCp.toFixed(1)} − ({(gc.n * r.qh).toFixed(1)}) = <span style={{ color: s.p.max >= 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{s.p.max > 0 ? '+' : ''}{s.p.max.toFixed(1)} Pa</span>
              </div>
              <div className="text-xs font-mono" style={{ color: C.dm }}>
                p− = {qGCp.toFixed(1)} − (+{gc.p}) × {r.qh.toFixed(1)} = {qGCp.toFixed(1)} − {(gc.p * r.qh).toFixed(1)} = <span style={{ color: C.neg, fontWeight: 'bold' }}>{s.p.min.toFixed(1)} Pa</span>
              </div>
            </div>
          );
        })}

        {/* Tabla resumen */}
        <div className="mt-2">
          <MiniTable
            heads={['Superficie', 'Cp', 'q·G·Cp', 'p+ [Pa]', 'p− [Pa]']}
            rows={[
              [{ v: `${r.wl.ww} — BV`, b: true }, { v: `+${r.cpWW}` }, { v: (r.qh * r.G * r.cpWW).toFixed(1) },
               { v: r.pWW.max > 0 ? `+${r.pWW.max.toFixed(1)}` : r.pWW.max.toFixed(1), b: true, c: C.pos },
               { v: r.pWW.min > 0 ? `+${r.pWW.min.toFixed(1)}` : r.pWW.min.toFixed(1), b: true, c: r.pWW.min >= 0 ? C.pos : C.neg }],
              [{ v: `${r.wl.lw} — SV`, b: true }, { v: r.cpLW.toFixed(2) }, { v: (r.qh * r.G * r.cpLW).toFixed(1) },
               { v: r.pLW.max > 0 ? `+${r.pLW.max.toFixed(1)}` : r.pLW.max.toFixed(1), b: true, c: r.pLW.max >= 0 ? C.pos : C.neg },
               { v: r.pLW.min.toFixed(1), b: true, c: C.neg }],
              [{ v: 'Lateral', b: true }, { v: r.cpLat.toFixed(1) }, { v: (r.qh * r.G * r.cpLat).toFixed(1) },
               { v: r.pLat.max.toFixed(1), b: true, c: r.pLat.max >= 0 ? C.pos : C.neg },
               { v: r.pLat.min.toFixed(1), b: true, c: C.neg }],
              [{ v: 'Cub BV max', b: true }, { v: r.cpRBV?.max?.toFixed(2) ?? '—' }, { v: (r.qh * r.G * (r.cpRBV?.max ?? 0)).toFixed(1) },
               { v: r.pRBVmax.max > 0 ? `+${r.pRBVmax.max.toFixed(1)}` : r.pRBVmax.max.toFixed(1), b: true, c: r.pRBVmax.max >= 0 ? C.pos : C.neg },
               { v: r.pRBVmax.min.toFixed(1), b: true, c: C.neg }],
              [{ v: 'Cub BV min', b: true }, { v: r.cpRBV?.min?.toFixed(2) ?? '—' }, { v: (r.qh * r.G * (r.cpRBV?.min ?? 0)).toFixed(1) },
               { v: r.pRBVmin.max > 0 ? `+${r.pRBVmin.max.toFixed(1)}` : r.pRBVmin.max.toFixed(1), b: true, c: r.pRBVmin.max >= 0 ? C.pos : C.neg },
               { v: r.pRBVmin.min.toFixed(1), b: true, c: C.neg }],
              [{ v: 'Cubierta SV', b: true }, { v: typeof r.cpRSV === 'number' ? r.cpRSV.toFixed(2) : '—' }, { v: (r.qh * r.G * (typeof r.cpRSV === 'number' ? r.cpRSV : 0)).toFixed(1) },
               { v: r.pRSV.max > 0 ? `+${r.pRSV.max.toFixed(1)}` : r.pRSV.max.toFixed(1), b: true, c: r.pRSV.max >= 0 ? C.pos : C.neg },
               { v: r.pRSV.min.toFixed(1), b: true, c: C.neg }],
            ]}
          />
        </div>
      </StepCard>

      {/* Paso 12 — Cargas en Pórtico (tabla) */}
      <StepCard n={12} title="Cargas en Pórtico Típico" refText="Aplicación" color={C.ac} link="main" linkLabel="→ Ver Resumen" goTab={goTab}>
        <Sym>w [kN/m] = p [Pa] × sep [m] / 1000</Sym>
        <Sub>Separación entre pórticos = {ff.sep.toFixed(2)} m | Apoyo: {ff.isEmp ? 'Empotrado' : 'Articulado'}</Sub>

        {/* Tabla de cargas distribuidas */}
        <MiniTable
          heads={['Elemento', 'p [Pa]', 'Cálculo w', 'w [kN/m]']}
          rows={[
            [{ v: `Col. BV (${r.wl.ww}) max`, b: true }, { v: r.pWW.max.toFixed(0), c: r.pWW.max >= 0 ? C.pos : C.neg },
             { v: `${r.pWW.max.toFixed(0)} × ${ff.sep.toFixed(2)} / 1000` },
             { v: ff.w_ww_max.toFixed(2), b: true, c: ff.w_ww_max >= 0 ? C.pos : C.neg }],
            [{ v: `Col. BV (${r.wl.ww}) min` }, { v: r.pWW.min.toFixed(0), c: r.pWW.min >= 0 ? C.pos : C.neg },
             { v: `${r.pWW.min.toFixed(0)} × ${ff.sep.toFixed(2)} / 1000` },
             { v: ff.w_ww_min.toFixed(2), b: true, c: ff.w_ww_min >= 0 ? C.pos : C.neg }],
            [{ v: `Col. SV (${r.wl.lw}) max` }, { v: r.pLW.max.toFixed(0), c: r.pLW.max >= 0 ? C.pos : C.neg },
             { v: `${r.pLW.max.toFixed(0)} × ${ff.sep.toFixed(2)} / 1000` },
             { v: ff.w_lw_max.toFixed(2), b: true, c: ff.w_lw_max >= 0 ? C.pos : C.neg }],
            [{ v: `Col. SV (${r.wl.lw}) min` }, { v: r.pLW.min.toFixed(0), c: r.pLW.min >= 0 ? C.pos : C.neg },
             { v: `${r.pLW.min.toFixed(0)} × ${ff.sep.toFixed(2)} / 1000` },
             { v: ff.w_lw_min.toFixed(2), b: true, c: ff.w_lw_min >= 0 ? C.pos : C.neg }],
            [{ v: r.is1agua ? 'Faldón (Cp max)' : 'Faldón BV (Cp max)', b: true }, { v: r.pRBVmax.max.toFixed(0), c: r.pRBVmax.max >= 0 ? C.pos : C.neg },
             { v: `${r.pRBVmax.max.toFixed(0)} × ${ff.sep.toFixed(2)} / 1000` },
             { v: ff.w_rbv_max.toFixed(2), b: true, c: ff.w_rbv_max >= 0 ? C.pos : C.neg }],
            [{ v: r.is1agua ? 'Faldón (Cp min)' : 'Faldón BV (Cp min)' }, { v: r.pRBVmin.min.toFixed(0), c: C.neg },
             { v: `${r.pRBVmin.min.toFixed(0)} × ${ff.sep.toFixed(2)} / 1000` },
             { v: ff.w_rbv_min.toFixed(2), b: true, c: C.neg }],
            ...(!r.is1agua ? [
              [{ v: 'Faldón SV (max)' }, { v: r.pRSV.max.toFixed(0), c: r.pRSV.max >= 0 ? C.pos : C.neg },
               { v: `${r.pRSV.max.toFixed(0)} × ${ff.sep.toFixed(2)} / 1000` },
               { v: ff.w_rsv_max.toFixed(2), b: true, c: ff.w_rsv_max >= 0 ? C.pos : C.neg }],
              [{ v: 'Faldón SV (min)' }, { v: r.pRSV.min.toFixed(0), c: C.neg },
               { v: `${r.pRSV.min.toFixed(0)} × ${ff.sep.toFixed(2)} / 1000` },
               { v: ff.w_rsv_min.toFixed(2), b: true, c: C.neg }],
            ] : []),
          ]}
        />

        {/* Reacciones en base */}
        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.bd}` }}>
          <div className="text-xs font-bold mb-1" style={{ color: C.tx }}>Reacciones en Base del Pórtico</div>
          <MiniTable
            heads={['Reacción', 'Fórmula', 'Valor']}
            rows={[
              [{ v: 'H total (corte)', b: true }, { v: `(pBV+pSV)·he·sep/1000` }, { v: `${ff.H_walls.toFixed(2)} kN`, b: true, c: C.ac }],
              [{ v: 'Rx (cada apoyo)', b: true }, { v: 'H/2' }, { v: `${ff.Rx_bv.toFixed(2)} kN`, b: true, c: C.ac }],
              [{ v: 'V cubierta', b: true }, { v: 'w_cub·cos(θ)·L_faldón' }, { v: `${ff.V_roof.toFixed(2)} kN`, b: true, c: ff.V_roof >= 0 ? C.pos : C.neg }],
              [{ v: 'Ry (cada apoyo)', b: true }, { v: 'V/2' }, { v: `${ff.Ry_bv.toFixed(2)} kN`, b: true, c: ff.Ry_bv >= 0 ? C.pos : C.neg }],
              ...(ff.isEmp ? [
                [{ v: 'M base BV', b: true }, { v: `w·h²/12 = ${ff.w_ww_max.toFixed(2)}×${r.he}²/12` }, { v: `${ff.M_bv.toFixed(2)} kN·m`, b: true, c: C.ac }],
                [{ v: 'M base SV', b: true }, { v: `w·h²/12 = ${ff.w_lw_min.toFixed(2)}×${r.he}²/12` }, { v: `${ff.M_sv.toFixed(2)} kN·m`, b: true, c: C.ac }],
              ] : [
                [{ v: 'M base', b: true }, { v: 'Articulado → M = 0' }, { v: '0.00 kN·m', b: true, c: C.dm }],
              ]),
            ]}
          />
        </div>
      </StepCard>

      {/* Referencia CIRSOC: Casos de carga */}
      <CirsocImg src="/cirsoc/image13.png" alt="Fig 2.4-8 Casos de carga" title="Referencia: Fig. 2.4-8 — Casos de carga de diseño" />
    </div>
  );
}
