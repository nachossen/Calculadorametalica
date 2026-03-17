/**
 * TabMemoria.jsx — Memoria de cálculo CIRSOC 301
 * Secciones colapsables con desglose completo.
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { C } from '../../ui/common/theme.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function ok(v) { return v <= 1.0; }
function Chip({ v, check }) {
  const pass = check !== undefined ? check : v <= 1.0;
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
      style={{ background: pass ? `${C.ok}20` : `${C.pos}20`, color: pass ? C.ok : C.pos, border: `1px solid ${pass ? C.ok : C.pos}40` }}>
      {pass ? 'OK' : 'NO'}
    </span>
  );
}

function Section({ title, accent, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.bd}`, marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2"
        style={{ background: C.cd, color: accent || C.ac }}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-xs font-bold">{title}</span>
      </button>
      {open && <div className="px-3 py-2 text-xs" style={{ color: C.tx }}>{children}</div>}
    </div>
  );
}

function Table({ heads, rows, mono = true }) {
  const cellCls = `px-2 py-1 text-xs${mono ? ' font-mono' : ''}`;
  return (
    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: C.sb }}>
          {heads.map((h, i) => (
            <th key={i} className={cellCls + ' text-left'}
              style={{ color: C.dm, borderBottom: `1px solid ${C.bd}`, fontSize: 10 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 ? `${C.cd}80` : 'transparent', borderBottom: `1px solid ${C.bd}22` }}>
            {row.map((cell, ci) => (
              <td key={ci} className={cellCls}
                style={{ color: ci === 0 ? C.dm : C.tx }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * @param {{
 *   result: Object,
 *   geo: Object,
 *   loadInp: Object,
 *   windCalc: Object|null,
 *   windMode: string,
 *   windInp: Object,
 *   fundResult: Object|null,
 *   verCorrea: Object|null,
 *   correa: Object|null,
 * }} props
 */
export function TabMemoria({ result, geo, loadInp, windCalc, windMode, windInp, fundResult, verCorrea, correa }) {
  if (!result) return (
    <div className="p-4 text-sm" style={{ color: C.pos }}>
      Sin resultados. Verificar geometría y cargas.
    </div>
  );

  const { perfilColumna: pCol, perfilRafter: pRaf, verColumna, verRafter,
    flechaCheck, envolvente: env, combinaciones, parametros: par } = result;

  const sep = par?.sep ?? 0;
  const theta = par?.theta ?? 0;

  // ── 1. Geometría ─────────────────────────────────────────────────────────
  const geoRows = [
    ['Luz B', `${geo.B} m`],
    ['Largo L', `${geo.L} m`],
    ['Altura alero he', `${geo.he} m`],
    ['Altura cumbrera hc', `${geo.hc} m`],
    ['N° pórticos', geo.nPorticos],
    ['Sep. pórticos', `${sep.toFixed(2)} m`],
    ['Sep. correas', `${geo.sepCorreas} m`],
    ['Tipo de base', geo.tipoBase],
    ['Ángulo faldón θ', `${theta.toFixed(2)}°`],
    ['Longitud rafter', `${par?.Lrafter?.toFixed(3) ?? '—'} m`],
    ['Longitud columna', `${par?.Lcolumna?.toFixed(3) ?? '—'} m`],
    ['Área planta', `${(geo.B * geo.L).toFixed(1)} m²`],
  ];

  // ── 2. Cargas ────────────────────────────────────────────────────────────
  const cargasRows = [
    ['Carga muerta D', `${loadInp.D?.toFixed(3) || '—'} kN/m²`],
    ['Sobrecarga techo Lr', `${loadInp.Lr?.toFixed(3) || '—'} kN/m²`],
    ['W col. barlovento', `${loadInp.W_barlovento_col?.toFixed(4) || '—'} kN/m²`],
    ['W col. sotavento', `${loadInp.W_sotavento_col?.toFixed(4) || '—'} kN/m²`],
    ['W raf. barlovento', `${loadInp.W_barlovento_raf?.toFixed(4) || '—'} kN/m²`],
    ['W raf. sotavento', `${loadInp.W_sotavento_raf?.toFixed(4) || '—'} kN/m²`],
  ];

  // ── 3. Modelo ────────────────────────────────────────────────────────────
  const arriostDesc = {
    sepGirts: `Sep. girts (${par?.sepGirts?.toFixed(1) ?? '—'} m)`,
    mitad: `Puntal al medio (he/2 = ${par?.Ly_col?.toFixed(2) ?? '—'} m)`,
    tercios: `Puntales a tercios (he/3 = ${par?.Ly_col?.toFixed(2) ?? '—'} m)`,
    custom: `Custom (${par?.Ly_col?.toFixed(2) ?? '—'} m)`,
  };
  const modeloRows = [
    ['Tipo de base', geo.tipoBase],
    ['Conexión alero', par?.rotula ? 'Rótula (M=0 en aleros)' : 'Rígida'],
    ['K col. eje fuerte',
      par?.Kcol != null
        ? `${par.Kcol.toFixed(2)}${geo.Kx_col != null ? ` (override, default: ${par.Kcol_default?.toFixed(2)})` : ''}`
        : '—'],
    ['KLx columna (eje fuerte)', `${par?.KLx_col?.toFixed(2) ?? '—'} m`],
    ['Arriostr. eje débil', arriostDesc[par?.arriostCol] ?? `Sep. girts`],
    ['KLy columna (eje débil)', `${par?.KLy_col?.toFixed(2) ?? '—'} m`],
    ['Lb columna (LTB)', `${par?.Lb_columna?.toFixed(2) ?? '—'} m`],
    ['KLx rafter', `${par?.KLx_raf?.toFixed(2) ?? '—'} m`],
    ['KLy rafter (sep. correas)', `${par?.KLy_raf?.toFixed(2) ?? '—'} m`],
    ['Lb rafter (LTB)', `${par?.Lb_rafter?.toFixed(2) ?? '—'} m`],
    ['Fy', `${250} MPa`],
    ['E', `${200000} MPa`],
  ];

  // ── 4. Combinaciones ─────────────────────────────────────────────────────
  const comboHeads = ['Comb.', 'NCol kN', 'VCol kN', 'MCol kN·m', 'NRaf kN', 'VRaf kN', 'MRaf kN·m'];
  const comboRows = (combinaciones || []).map(c => {
    const col = c.elementForces?.[0];
    const raf = c.elementForces?.[1];
    return [
      c.nombre || c.id || '—',
      col ? col.Ni?.toFixed(1) : '—',
      col ? col.Vi?.toFixed(1) : '—',
      col ? col.Mi?.toFixed(1) : '—',
      raf ? raf.Ni?.toFixed(1) : '—',
      raf ? raf.Vi?.toFixed(1) : '—',
      raf ? raf.Mi?.toFixed(1) : '—',
    ];
  });

  // ── 5. Perfiles ──────────────────────────────────────────────────────────
  function perfilRows(perfil, ver, label) {
    if (!perfil || !ver) return [];
    return [
      [`${label} — Perfil`, perfil.nombre],
      [`${label} — Peso`, `${perfil.peso} kg/m`],
      [`${label} — A`, `${perfil.A} cm²`],
      [`${label} — Ix / Sx`, `${perfil.Ix} / ${perfil.Sx} cm⁴/cm³`],
      [`${label} — φPn`, `${ver.phiPn?.toFixed(0)} kN`],
      [`${label} — φMn`, `${ver.phiMn?.toFixed(0)} kN·m`],
      [`${label} — φVn`, `${ver.phiVn?.toFixed(0)} kN`],
      [`${label} — KL/r`, `${ver.KLr?.toFixed(1)}`],
      [`${label} — Zona LTB`, ver.zona || '—'],
      [`${label} — H1 ratio`, `${ver.ratioH1?.toFixed(3)} (${ver.formulaH1})`],
      [`${label} — Corte ratio`, `${ver.ratioCorte?.toFixed(3)}`],
    ];
  }
  const perfilesRows = [
    ...perfilRows(pCol, verColumna, 'Col'),
    ...perfilRows(pRaf, verRafter, 'Raf'),
  ];

  // ── 6. Envolvente ─────────────────────────────────────────────────────────
  const envRows = [
    ['Col. N máx', `${env?.columna?.Nmax?.toFixed(1) ?? '—'} kN`],
    ['Col. V máx', `${env?.columna?.Vmax?.toFixed(1) ?? '—'} kN`],
    ['Col. M máx', `${env?.columna?.Mmax?.toFixed(1) ?? '—'} kN·m`],
    ['Raf. N máx', `${env?.rafter?.Nmax?.toFixed(1) ?? '—'} kN`],
    ['Raf. V máx', `${env?.rafter?.Vmax?.toFixed(1) ?? '—'} kN`],
    ['Raf. M máx', `${env?.rafter?.Mmax?.toFixed(1) ?? '—'} kN·m`],
  ];

  // ── 7. Flecha ────────────────────────────────────────────────────────────

  // ── 8. Correa ────────────────────────────────────────────────────────────
  const hasCorrea = verCorrea && correa;

  // ── 9. Fundaciones ───────────────────────────────────────────────────────
  const hasFund = !!fundResult;

  // ── 0. Verificación de equilibrio global — todas las combinaciones ──────────
  const equilibrioData = useMemo(() => {
    if (!combinaciones?.length) return null;
    const { B, he, hc } = geo;
    const nodesPos = [[0, 0], [0, he], [B / 2, hc], [B, he], [B, 0]];
    const conn = [[0, 1], [1, 2], [2, 3], [3, 4]];

    const rows = [];
    for (const combo of combinaciones) {
      if (!combo?.nodeReactions || !combo.loads) continue;
      let sumFx = 0, sumFy = 0;
      for (const ld of combo.loads) {
        const [ni, nj] = conn[ld.elemIdx];
        const [xi, yi] = nodesPos[ni], [xj, yj] = nodesPos[nj];
        const dx = xj - xi, dy = yj - yi;
        const L = Math.sqrt(dx * dx + dy * dy);
        const theta_e = Math.atan2(dy, dx);
        const cosT = Math.cos(theta_e), sinT = Math.sin(theta_e);
        const wp = ld.wPerp || 0, wa = ld.wAxial || 0;
        sumFx += wp * L * (-sinT) + wa * L * cosT;
        sumFy += wp * L * cosT    + wa * L * sinT;
      }
      const { node0, node4 } = combo.nodeReactions;
      const sumRx = (node0?.Rx || 0) + (node4?.Rx || 0);
      const sumRy = (node0?.Ry || 0) + (node4?.Ry || 0);
      const maxF = Math.max(Math.abs(sumFx), Math.abs(sumFy), 0.01);
      const desPct = Math.max(Math.abs(sumFx + sumRx), Math.abs(sumFy + sumRy)) / maxF * 100;
      rows.push({ combo, sumFx, sumFy, sumRx, sumRy, desPct, ok: desPct < 0.1 });
    }
    if (!rows.length) return null;
    const allOk = rows.every(r => r.ok);
    return { rows, allOk };
  }, [combinaciones, geo]);

  return (
    <div className="max-w-4xl">

      {/* 0 — Verificación de equilibrio global */}
      {equilibrioData && (
        <Section title="0. Verificación de equilibrio global" accent={equilibrioData.allOk ? C.ok : C.pos}>
          <div className="text-[10px] mb-1.5 flex items-center gap-2" style={{ color: C.dm }}>
            <span>ΣF_aplicadas + ΣReacciones = 0 · {equilibrioData.rows.length} combinaciones</span>
            <Chip check={equilibrioData.allOk} />
          </div>
          <Table
            heads={['Combinación', 'ΣFx (kN)', 'ΣFy (kN)', 'ΣRx (kN)', 'ΣRy (kN)', 'Desbal. %']}
            rows={equilibrioData.rows.map(r => [
              r.combo.nombre || r.combo.id,
              `${r.sumFx >= 0 ? '+' : ''}${r.sumFx.toFixed(2)}`,
              `${r.sumFy >= 0 ? '+' : ''}${r.sumFy.toFixed(2)}`,
              `${r.sumRx >= 0 ? '+' : ''}${r.sumRx.toFixed(2)}`,
              `${r.sumRy >= 0 ? '+' : ''}${r.sumRy.toFixed(2)}`,
              r.desPct.toFixed(4) + (r.ok ? ' ✓' : ' ✗'),
            ])}
          />
        </Section>
      )}

      {/* 1 — Geometría */}
      <Section title="1. Geometría">
        <Table heads={['Parámetro', 'Valor']} rows={geoRows} />
      </Section>

      {/* 2 — Cargas */}
      <Section title="2. Cargas de diseño">
        <Table heads={['Carga', 'Valor']} rows={cargasRows} />
        {windMode === '102' && windCalc && (
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.bd}` }}>
            <div className="text-[10px] font-bold mb-1.5" style={{ color: C.w }}>Viento — CIRSOC 102</div>
            <Table heads={['Parámetro', 'Valor']} rows={[
              ['Localidad', windInp?.localidad || '—'],
              ['Categoría riesgo', windInp?.riesgo || '—'],
              ['Exposición', windInp?.exposicion || '—'],
              ['Altitud', `${windInp?.altitud || 0} m.s.n.m.`],
              ['V básica (diseño)', `${windCalc.V.toFixed(1)} m/s`],
              ['V servicio (50 años)', `${windCalc.V_service?.toFixed(1) ?? '—'} m/s`],
              ['Kz (he)', windCalc.Kz.toFixed(4)],
              ['Ke', windCalc.Ke.toFixed(4)],
              ['Kd', windCalc.Kd.toFixed(2)],
              ['G (factor ráfaga)', windCalc.G?.toFixed(2) ?? '0.85'],
              ['GCpi (edificio cerrado)', `±${windCalc.GCpi?.toFixed(2) ?? '0.18'}`],
              ['qh', `${(windCalc.qh * 1000).toFixed(1)} Pa`],
              ['— Cp puros Fig. 2.4-1 —', ''],
              ['Cp col. BV (W1)', windCalc.cp_W1?.col_bv?.toFixed(2) ?? '—'],
              ['Cp col. SV (W1)', windCalc.cp_W1?.col_sv?.toFixed(2) ?? '—'],
              ['Cp raf. BV (W1)', windCalc.cp_W1?.raf_bv?.toFixed(2) ?? '—'],
              ['Cp raf. SV (W1)', windCalc.cp_W1?.raf_sv?.toFixed(2) ?? '—'],
              ['Cp col. (W2)',    windCalc.cp_W2?.col?.toFixed(2)    ?? '—'],
              ['Cp raf. (W2)',    windCalc.cp_W2?.raf?.toFixed(2)    ?? '—'],
              ['— p neta = qh·G·Cp ∓ qh·GCpi —', ''],
              ['p col. BV (W1)', `${(windCalc.pressures_W1?.W_barlovento_col * 1000)?.toFixed(1) ?? '—'} Pa`],
              ['p col. SV (W1)', `${(windCalc.pressures_W1?.W_sotavento_col  * 1000)?.toFixed(1) ?? '—'} Pa`],
              ['p raf. BV (W1)', `${(windCalc.pressures_W1?.W_barlovento_raf * 1000)?.toFixed(1) ?? '—'} Pa`],
              ['p raf. SV (W1)', `${(windCalc.pressures_W1?.W_sotavento_raf  * 1000)?.toFixed(1) ?? '—'} Pa`],
            ]} />
          </div>
        )}
      </Section>

      {/* 3 — Modelo */}
      <Section title="3. Modelo estructural">
        <Table heads={['Parámetro', 'Valor']} rows={modeloRows} />
      </Section>

      {/* 4 — Combinaciones */}
      <Section title="4. Combinaciones LRFD — Esfuerzos en extremos" defaultOpen={false}>
        {comboRows.length > 0
          ? <Table heads={comboHeads} rows={comboRows} />
          : <div style={{ color: C.dm }}>Sin datos de combinaciones.</div>}
      </Section>

      {/* 5 — Envolvente */}
      <Section title="5. Esfuerzos envolventes (máximos absolutos)">
        <Table heads={['Esfuerzo', 'Valor']} rows={envRows.map(r => [r[0], r[1]])} />
      </Section>

      {/* 6 — Verificación de perfiles */}
      <Section title="6. Verificación de perfiles (CIRSOC 301-2018 / AISC 360)">
        <div className="space-y-6">
          {[
            { label: 'Columna', perfil: pCol, ver: verColumna, flechaKey: 'columna', flechaLabel: 'Flecha lat. δH / H/150' },
            { label: 'Rafter',  perfil: pRaf, ver: verRafter,  flechaKey: 'rafter',  flechaLabel: 'Flecha vert. δV / L/240' },
          ].map(({ label, perfil, ver, flechaKey, flechaLabel }) => {
            if (!perfil || !ver) return null;
            const dt  = ver.detalles;
            const pnX = dt?.pnX;
            const pnY = dt?.pnY;
            const mn  = dt?.mn;
            const vn  = dt?.vn;
            const h1  = dt?.h1;
            const fle = flechaCheck?.[flechaKey];
            const isCol = label === 'Columna';
            // Eje crítico de pandeo
            const ejeCrit = pnX && pnY ? (pnX.phiPn <= pnY.phiPn ? 'x' : 'y') : '—';
            const pnCrit  = ejeCrit === 'x' ? pnX : pnY;

            return (
              <div key={label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-xs" style={{ color: C.ac }}>{label} — {perfil.nombre}</span>
                  <Chip check={ver.pasa} />
                  <span className="text-[10px]" style={{ color: C.dm }}>combo dominante: {ver.comboDominante || '—'}</span>
                </div>

                {/* φPn — Art. E3 */}
                <div className="mb-2">
                  <div className="text-[10px] font-semibold mb-1" style={{ color: C.ac }}>φPn — Pandeo por flexión (Art. E3)</div>
                  {pnCrit ? (
                    <Table heads={['Paso', 'Fórmula', 'Valor']} rows={[
                      ['Eje crítico', `eje ${ejeCrit} (KL=${ejeCrit==='x'?par?.KLx_col?.toFixed(2):par?.KLy_col?.toFixed(2)}m, r${ejeCrit}=${ejeCrit==='x'?perfil.rx:perfil.ry} cm)`, `KL/r = ${pnCrit.KLr?.toFixed(1)}`],
                      ['Tensión de Euler', `Fe = π²E/(KL/r)² = π²×200000/${pnCrit.KLr?.toFixed(1)}²`, `${pnCrit.Fe?.toFixed(1)} MPa`],
                      ['Límite elástico', `4.71√(E/Fy) = 4.71√(200000/345)`, `${(4.71*Math.sqrt(200000/345)).toFixed(1)}`],
                      [pnCrit.KLr <= 4.71*Math.sqrt(200000/345) ? 'Pandeo inelástico' : 'Pandeo elástico',
                        pnCrit.KLr <= 4.71*Math.sqrt(200000/345)
                          ? `Fcr = 0.658^(Fy/Fe)×Fy = 0.658^(${(345/pnCrit.Fe).toFixed(3)})×345`
                          : `Fcr = 0.877×Fe = 0.877×${pnCrit.Fe?.toFixed(1)}`,
                        `${pnCrit.Fcr?.toFixed(1)} MPa`],
                      ['Ag', `A = ${perfil.A} cm²`, `${perfil.A} cm²`],
                      ['Pn = Fcr×Ag/10', `${pnCrit.Fcr?.toFixed(1)}×${perfil.A}/10`, `${(pnCrit.Fcr*perfil.A/10).toFixed(1)} kN`],
                      ['φPn = 0.9×Pn', `0.9×${(pnCrit.Fcr*perfil.A/10).toFixed(1)}`, `${ver.phiPn?.toFixed(1)} kN`],
                    ]} />
                  ) : <div style={{ color: C.dm }}>Sin datos.</div>}
                </div>

                {/* φMn — Art. F2 */}
                <div className="mb-2">
                  <div className="text-[10px] font-semibold mb-1" style={{ color: C.ac }}>φMn — Pandeo lateral-torsional (Art. F2)</div>
                  {mn ? (
                    <Table heads={['Paso', 'Fórmula', 'Valor']} rows={[
                      ['Mp = Fy×Zx/1000', `${345}×${perfil.Zx}/1000`, `${mn.Mp?.toFixed(1)} kN·m`],
                      ['ry', `radio de giro eje débil`, `${perfil.ry} cm`],
                      ['Lp = 1.76×ry×√(E/Fy)', `1.76×${perfil.ry}×√(200000/345)`, `${mn.Lp?.toFixed(2)} m`],
                      ['rts = √(√(Iy×Cw)/Sx)', `√(√(${perfil.Iy}×${perfil.Cw})/${perfil.Sx})`, `${(Math.sqrt(Math.sqrt(perfil.Iy*perfil.Cw)/perfil.Sx)).toFixed(2)} cm`],
                      ['Lr = 1.95×rts×...', `(ver fórmula F2-6)`, `${mn.Lr?.toFixed(2)} m`],
                      ['Lb usado', `ala ${label==='Rafter'?'sup/inf':'ext/int'} según M`, `${ver.detalles?.mn?.Lb_usado !== undefined ? ver.detalles.mn.Lb_usado?.toFixed(2) : '—'} m`],
                      ['Zona PLT', `Lp=${mn.Lp?.toFixed(2)}m  Lr=${mn.Lr?.toFixed(2)}m`, mn.zona || '—'],
                      mn.zona === 'plástica'
                        ? ['Mn = Mp', `Lb ≤ Lp → zona plástica`, `${mn.Mp?.toFixed(1)} kN·m`]
                        : mn.zona === 'inelástica'
                          ? ['Mn (interpolado)', `Cb×[Mp-(Mp-0.7FySx/1000)×(Lb-Lp)/(Lr-Lp)]`, `${(ver.phiMn/0.9)?.toFixed(1)} kN·m`]
                          : ['Mn (elástico)', `Fcr×Sx/1000`, `${(ver.phiMn/0.9)?.toFixed(1)} kN·m`],
                      ['φMn = 0.9×Mn', `0.9×${(ver.phiMn/0.9)?.toFixed(1)}`, `${ver.phiMn?.toFixed(1)} kN·m`],
                    ]} />
                  ) : <div style={{ color: C.dm }}>Sin datos.</div>}
                </div>

                {/* H1 */}
                <div className="mb-2">
                  <div className="text-[10px] font-semibold mb-1" style={{ color: C.ac }}>Interacción H1 (Art. H1-1)</div>
                  {h1 ? (() => {
                    const Pu = ver.allCombos?.find(c => c.id === ver.comboId)?.N ?? 0;
                    const Mu = ver.allCombos?.find(c => c.id === ver.comboId)?.M ?? 0;
                    const phiPn = ver.phiPn ?? 1;
                    const phiMn = ver.phiMn ?? 1;
                    const axRat = Pu / phiPn;
                    return (
                      <Table heads={['Paso', 'Desarrollo', 'Valor']} rows={[
                        ['Pu (combo dom.)', `N máx = ${Pu.toFixed(1)} kN`, `${Pu.toFixed(1)} kN`],
                        ['Mu (combo dom.)', `M máx = ${Mu.toFixed(1)} kN·m`, `${Mu.toFixed(1)} kN·m`],
                        ['Pu/φPn', `${Pu.toFixed(1)}/${phiPn.toFixed(1)}`, `${axRat.toFixed(3)} ${axRat >= 0.2 ? '≥ 0.2 → H1-1a' : '< 0.2 → H1-1b'}`],
                        h1.formula === 'H1-1a'
                          ? ['H1-1a', `Pu/φPn + (8/9)×Mu/φMn = ${axRat.toFixed(3)} + (8/9)×${(Mu/phiMn).toFixed(3)}`, `${h1.ratio?.toFixed(3)}`]
                          : ['H1-1b', `Pu/(2φPn) + Mu/φMn = ${(Pu/(2*phiPn)).toFixed(3)} + ${(Mu/phiMn).toFixed(3)}`, `${h1.ratio?.toFixed(3)}`],
                        ['Resultado', `ratio ≤ 1.0`, <Chip v={h1.ratio} />],
                      ]} />
                    );
                  })() : <div style={{ color: C.dm }}>Sin datos.</div>}
                </div>

                {/* Corte + Flecha */}
                <div>
                  <div className="text-[10px] font-semibold mb-1" style={{ color: C.ac }}>Corte y flecha</div>
                  <Table heads={['Verificación', 'Desarrollo', 'Ratio']} rows={[
                    ['φVn (Art. G2)', `0.6×Fy×Aw×Cv1 = 0.6×345×${((perfil.d*perfil.tw)/100).toFixed(2)}×1.0`, `${ver.phiVn?.toFixed(1)} kN`],
                    ['V / φVn', `corte / ${ver.phiVn?.toFixed(1)} kN`, <><span>{ver.ratioCorte?.toFixed(3)}</span> <Chip v={ver.ratioCorte} /></>],
                    ...(fle ? [[flechaLabel, `${fle.delta?.toFixed(1)} mm / ${fle.limite?.toFixed(1)} mm`, <Chip v={fle.ratio} />]] : []),
                  ]} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 7 — Correas */}
      <Section title="7. Verificación de correas (AISI S100)">
        {hasCorrea ? (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-bold text-xs" style={{ color: C.ac }}>{correa.nombre}</span>
              <Chip check={verCorrea.pasa} />
            </div>
            <div className="text-[10px] font-semibold mb-1" style={{ color: C.dm }}>Gravedad — 1.2D + 1.6Lr (ala superior arriostrada por chapeado)</div>
            <Table heads={['Parámetro', 'Valor', '']} rows={[
              ['Luz L (sep. pórticos)', `${sep.toFixed(2)} m`, ''],
              ['Trib. sep. correas', `${geo.sepCorreas} m`, ''],
              ['qd (D perp.)', `${verCorrea.qd_correa?.toFixed(4)} kN/m`, ''],
              ['qlr (Lr perp.)', `${verCorrea.qlr_correa?.toFixed(4)} kN/m`, ''],
              ['qu (LRFD)', `${verCorrea.qu?.toFixed(4)} kN/m`, ''],
              ['Mu = qu·L²/8', `${verCorrea.Mu} kN·m`, ''],
              ['φMn = 0.9·Fy·Sx/1e3', `${verCorrea.phiMn} kN·m`, ''],
              ['Ratio M (Mu/φMn)', verCorrea.ratioM, <Chip v={verCorrea.ratioM} />],
              ['δ servicio (D+Lr)', `${verCorrea.delta_mm} mm`, ''],
              ['Límite L/240', `${verCorrea.limite_mm} mm`, ''],
              ['Ratio flecha', verCorrea.ratioFlecha, <Chip v={verCorrea.ratioFlecha} />],
            ]} />

            {verCorrea.uplift ? (
              <div className="mt-2">
                <div className="text-[10px] font-semibold mb-1" style={{ color: C.w }}>
                  Succión — 0.9D + 1.0W (ala inferior comprimida, LTB reducido)
                </div>
                <Table heads={['Parámetro', 'Valor', '']} rows={[
                  ['Lb (ala inferior)', `${verCorrea.uplift.Lb_uplift_m} m`, ''],
                  ['Factor LTB (φ)', verCorrea.uplift.ltbFactor, ''],
                  ['φMn reducido', `${verCorrea.uplift.phiMn_uplift} kN·m`, ''],
                  ['Mu succión = q_net·L²/8', `${verCorrea.uplift.Mu_uplift} kN·m`, ''],
                  ['Ratio M (Mu/φMn)', verCorrea.uplift.ratioM_uplift, <Chip v={verCorrea.uplift.ratioM_uplift} />],
                ]} />
              </div>
            ) : (
              <div className="mt-1.5 text-[10px]" style={{ color: C.dm }}>
                Succión neta: sin verificación (W_uplift = 0 o succión neta negativa — gravedad domina).
              </div>
            )}

            <div className="mt-1 text-[10px]" style={{ color: C.dm }}>
              Fy={correa.Fy} MPa · Ix={correa.Ix} cm⁴ · Sx={correa.Sx} cm³ · E=200000 MPa
            </div>
          </div>
        ) : (
          <div style={{ color: C.dm }}>
            {correa?.Sx
              ? 'Error en la verificación de correas.'
              : 'Seleccione un perfil de correa con propiedades de sección para verificar.'}
          </div>
        )}
      </Section>

      {/* 8 — Fundaciones */}
      <Section title="8. Fundaciones (predimensionado)">
        {hasFund ? (
          <div>
            <Table heads={['Parámetro', 'Valor']} rows={
              fundResult.tipo === 'superficial' ? [
                ['Tipo', 'Superficial — zapata aislada'],
                ['N bases', fundResult.nBases],
                ['Lado B = L', `${fundResult.base.B?.toFixed(2) ?? '—'} m`],
                ['Alto zapata', `${fundResult.base.alto?.toFixed(2) ?? '—'} m`],
                ['σ adm', `${fundResult.base.cap?.qAdm?.toFixed(1) ?? '—'} kPa`],
                ['σ max', `${fundResult.base.sigma_max?.toFixed(1) ?? '—'} kPa`],
                ['Vol. hormigón / base', `${fundResult.base.volumen?.toFixed(3) ?? '—'} m³`],
                ['Hormigón total', `${fundResult.volTotalHormigon?.toFixed(2) ?? '—'} m³`],
              ] : [
                ['Tipo', 'Pilotes'],
                ['Pilotes por base', fundResult.base.nPilotes ?? '—'],
                ['Total pilotes', fundResult.nPilotesTotal ?? '—'],
                ['Q adm pilote', `${fundResult.base.Qpilote_adm?.toFixed(1) ?? '—'} kN`],
                ['Q max pilote', `${fundResult.base.Q_max_pilote?.toFixed(1) ?? '—'} kN`],
                ['Dado cabecera', `${fundResult.base.anchoDado?.toFixed(2) ?? '—'} × ${fundResult.base.altoDado?.toFixed(2) ?? '—'} m`],
                ['Hormigón total', `${fundResult.volTotalHormigon?.toFixed(2) ?? '—'} m³`],
              ]
            } />
          </div>
        ) : (
          <div style={{ color: C.dm }}>Sin datos de fundaciones. Configure el tab Fundaciones.</div>
        )}
      </Section>

    </div>
  );
}
