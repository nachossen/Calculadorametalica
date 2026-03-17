/**
 * ui/tabs/TabTablas.jsx — Tablas CIRSOC 102-2025 completas con filas resaltadas
 * Ordenadas crecientemente por número de tabla/figura
 */

import { Badge } from '../common/Badge.jsx';
import { VELOCIDADES_ARG, CAT_RIESGO } from '../../data/velocidades.js';
import { T_1_6_1 } from '../../data/kd.js';
import { T_1_9_1 } from '../../data/exposicion.js';
import { T_1_11_1 } from '../../data/gcpi.js';
import { T_1_12_1 } from '../../data/ke.js';
import { T_1_13_1 } from '../../data/kz-tabla.js';
import { TOPO_K1_TABLE, TOPO_K2_TABLE, TOPO_K3_TABLE, TOPO_K1_RATIO, TOPO_GAMMA, TOPO_MU } from '../../data/topografia.js';
import { CP_WW, CP_LAT, CP_LW_TABLE } from '../../core/pressure.js';
import { CP_ROOF_N_BV_025, CP_ROOF_N_BV_050, CP_ROOF_N_BV_100, CP_ROOF_N_SV, CP_ROOF_PAR_05, CP_ROOF_PAR_10 } from '../../roofTypes/dosAguas/cp.js';
import { GCPF_C1, GCPF_C2, GCPF_C3, GCPF_C4, ENV_ZONES_C1, ENV_ZONES_C2, ENV_ZONES_C3, ENV_ZONES_C4, ZONE_DESC } from '../../data/envolventeGCpf.js';
import { CR_WALL_Z4, CR_WALL_Z5 } from '../../data/crWalls.js';
import { CR_ROOF_A, CR_ROOF_B, CR_ROOF_C, CR_ROOF_D } from '../../data/crRoofs.js';
import { C } from '../common/theme.js';

/**
 * @param {Object} props
 * @param {string} [props.filter] - 'all' | 'dir' | 'env' | 'cr'. Default shows all.
 */
export function TabTablas({ r, inp, filter = 'all' }) {
  const th2 = { background: C.bg, color: C.dm, padding: '4px 7px', fontSize: 10, textAlign: 'left', borderBottom: `1px solid ${C.bd}`, position: 'sticky', top: 0, zIndex: 1 };
  const td2 = { padding: '3px 7px', fontSize: 10, color: C.tx, borderBottom: `1px solid ${C.bd}`, fontFamily: 'monospace' };
  const hl2 = { ...td2, background: `${C.ac}12`, fontWeight: 'bold' };

  // Method membership: tables with methods show in 'all' + those methods.
  // Tables without methods (Cap.1 general) show ONLY in 'all'.
  function TblWrap({ title, norm, methods, children }) {
    if (filter === 'all') { /* show everything */ }
    else if (!methods || !methods.includes(filter)) return null;
    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1"><Badge>{norm}</Badge><span className="text-xs font-bold" style={{ color: C.tx }}>{title}</span></div>
        <div className="overflow-auto rounded" style={{ background: C.cd, border: `1px solid ${C.bd}`, maxHeight: 400 }}>{children}</div>
      </div>
    );
  }

  function Note({ children }) {
    return <div className="px-2 py-1 text-xs" style={{ color: C.dm }}>{children}</div>;
  }

  const riskCol = inp?.riesgo ? CAT_RIESGO[inp.riesgo]?.col : null;

  return (
    <div className="space-y-1 max-w-5xl p-4">

      {/* ── Fig. 1.5-1: Velocidades ── */}
      <TblWrap title="Velocidades Básicas de Viento por Ciudad" norm="Fig. 1.5-1">
        <table className="w-full"><thead><tr>
          <th style={th2}>Ciudad</th>
          <th style={{ ...th2, ...(riskCol === 'V300' ? { color: C.ac } : {}) }}>V300 (m/s)</th>
          <th style={{ ...th2, ...(riskCol === 'V700' ? { color: C.ac } : {}) }}>V700 (m/s)</th>
          <th style={{ ...th2, ...(riskCol === 'V1700' ? { color: C.ac } : {}) }}>V1700 (m/s)</th>
        </tr></thead><tbody>
          {Object.entries(VELOCIDADES_ARG).map(([city, v]) => {
            const isCurrent = city === inp?.localidad;
            const s = isCurrent ? hl2 : td2;
            return <tr key={city}>
              <td style={s}>{city}</td>
              <td style={riskCol === 'V300' && isCurrent ? { ...hl2, color: C.ac } : s}>{v.V300}</td>
              <td style={riskCol === 'V700' && isCurrent ? { ...hl2, color: C.ac } : s}>{v.V700}</td>
              <td style={riskCol === 'V1700' && isCurrent ? { ...hl2, color: C.ac } : s}>{v.V1700}</td>
            </tr>;
          })}
        </tbody></table>
      </TblWrap>

      {/* ── Tabla 1.6-1: Kd ── */}
      <TblWrap title="Factor de Direccionalidad Kd" norm="Tabla 1.6-1">
        <table className="w-full"><thead><tr><th style={th2}>Tipo de Estructura</th><th style={th2}>Kd</th></tr></thead><tbody>
          {Object.entries(T_1_6_1).map(([k, v]) => <tr key={k}><td style={k === r.structKey ? hl2 : td2}>{k}</td><td style={k === r.structKey ? hl2 : td2}>{v.toFixed(2)}</td></tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 1.8-1: Topografía K1 ── */}
      <TblWrap title="Multiplicador K1 (por H/Lh)" norm="Fig. 1.8-1">
        <table className="w-full"><thead><tr><th style={th2}>H/Lh</th><th style={th2}>Loma 2D</th><th style={th2}>Escarpa 2D</th><th style={th2}>Colina 3D</th></tr></thead><tbody>
          {TOPO_K1_TABLE.map((row, i) => { const near = r.HLh > 0 && Math.abs(row.hl - r.HLh) < 0.05; return <tr key={i}><td style={near ? hl2 : td2}>{row.hl.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.loma.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.escarpa.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.colina.toFixed(2)}</td></tr>; })}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 1.8-1: K1/(H/Lh) Ratio ── */}
      <TblWrap title="K1/(H/Lh) Ratio por Exposición y Forma" norm="Fig. 1.8-1">
        <table className="w-full"><thead><tr><th style={th2}>Forma</th><th style={th2}>B</th><th style={th2}>C</th><th style={th2}>D</th></tr></thead><tbody>
          {Object.entries(TOPO_K1_RATIO).map(([k, v]) => <tr key={k}><td style={td2}>{k}</td><td style={r.exp === 'B' ? { ...td2, color: C.ac } : td2}>{v.B.toFixed(2)}</td><td style={r.exp === 'C' ? { ...td2, color: C.ac } : td2}>{v.C.toFixed(2)}</td><td style={r.exp === 'D' ? { ...td2, color: C.ac } : td2}>{v.D.toFixed(2)}</td></tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 1.8-1: K2 ── */}
      <TblWrap title="Multiplicador K2 (por x/Lh)" norm="Fig. 1.8-1">
        <table className="w-full"><thead><tr><th style={th2}>x/Lh</th><th style={th2}>Escarpa 2D</th><th style={th2}>Todos los otros</th></tr></thead><tbody>
          {TOPO_K2_TABLE.map((row, i) => { const near = r.xLh >= 0 && Math.abs(row.xl - r.xLh) < 0.25; return <tr key={i}><td style={near ? hl2 : td2}>{row.xl.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.escarpa.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.otros.toFixed(2)}</td></tr>; })}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 1.8-1: K3 ── */}
      <TblWrap title="Multiplicador K3 (por z/Lh)" norm="Fig. 1.8-1">
        <table className="w-full"><thead><tr><th style={th2}>z/Lh</th><th style={th2}>Loma 2D</th><th style={th2}>Escarpa 2D</th><th style={th2}>Colina 3D</th></tr></thead><tbody>
          {TOPO_K3_TABLE.map((row, i) => { const near = r.zLh >= 0 && Math.abs(row.zl - r.zLh) < 0.05; return <tr key={i}><td style={near ? hl2 : td2}>{row.zl.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.loma.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.escarpa.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.colina.toFixed(2)}</td></tr>; })}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 1.8-1: γ ── */}
      <TblWrap title="Factor γ (atenuación horizontal)" norm="Fig. 1.8-1">
        <table className="w-full"><thead><tr><th style={th2}>Forma</th><th style={th2}>γ</th></tr></thead><tbody>
          {Object.entries(TOPO_GAMMA).map(([k, v]) => <tr key={k}><td style={td2}>{k}</td><td style={td2}>{v}</td></tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 1.8-1: μ ── */}
      <TblWrap title="Factor μ (atenuación por distancia)" norm="Fig. 1.8-1">
        <table className="w-full"><thead><tr><th style={th2}>Forma</th><th style={th2}>μ BV</th><th style={th2}>μ SV</th></tr></thead><tbody>
          {Object.entries(TOPO_MU).map(([k, v]) => <tr key={k}><td style={td2}>{k}</td><td style={td2}>{v.bv}</td><td style={td2}>{v.sv}</td></tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Tabla 1.9-1: Exposición ── */}
      <TblWrap title="Constantes de Exposición del Terreno" norm="Tabla 1.9-1">
        <table className="w-full"><thead><tr><th style={th2}>Const.</th>
          <th style={{ ...th2, ...(r.exp === 'B' ? { color: C.ac } : {}) }}>B</th>
          <th style={{ ...th2, ...(r.exp === 'C' ? { color: C.ac } : {}) }}>C</th>
          <th style={{ ...th2, ...(r.exp === 'D' ? { color: C.ac } : {}) }}>D</th>
        </tr></thead><tbody>
          {[['α', e => e.alpha], ['zg [m]', e => e.zg], ['b̂', e => e.b_hat],
            ['b̄', e => e.b_bar], ['c', e => e.c], ['ℓ [m]', e => e.l], ['zmin [m]', e => e.zmin],
          ].map(([n, fn]) => <tr key={n}><td style={td2}>{n}</td>
            {['B', 'C', 'D'].map(e => <td key={e} style={e === r.exp ? { ...hl2, color: C.ac } : td2}>{fn(T_1_9_1[e])}</td>)}
          </tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Sec. 1.9.3.1: Frecuencia Natural ── */}
      <TblWrap title="Frecuencia Fundamental n1 — Ecuaciones" norm="Sec. 1.9.3.1">
        <table className="w-full"><thead><tr><th style={th2}>Sistema</th><th style={th2}>Ecuación</th><th style={th2}>Ref.</th></tr></thead><tbody>
          <tr><td style={r?.structSystem === 'Acero' ? hl2 : td2}>Acero</td><td style={r?.structSystem === 'Acero' ? hl2 : td2}>n1 = 8.58 / h^0.8</td><td style={td2}>Ec. 1.9-2</td></tr>
          <tr><td style={r?.structSystem === 'HA' ? hl2 : td2}>Hormigón Armado</td><td style={r?.structSystem === 'HA' ? hl2 : td2}>n1 = 14.93 / h^0.9</td><td style={td2}>Ec. 1.9-3</td></tr>
          <tr><td style={r?.structSystem === 'Otra' ? hl2 : td2}>Otra estructura</td><td style={r?.structSystem === 'Otra' ? hl2 : td2}>n1 = 22.86 / h</td><td style={td2}>Ec. 1.9-4</td></tr>
          <tr><td style={r?.structSystem === 'Muro cortante' ? hl2 : td2}>Muro cortante</td><td style={r?.structSystem === 'Muro cortante' ? hl2 : td2}>n1 = 117.3 × √Cw / h</td><td style={td2}>Ec. 1.9-5</td></tr>
        </tbody></table>
        {r?.n1 != null && <Note>Sistema: {r.structSystem} → n1=<strong style={{ color: C.ac }}>{r.n1.toFixed(3)} Hz</strong> ({r.isRigid ? 'Rígida' : 'Flexible'})</Note>}
      </TblWrap>

      {/* ── Tabla 1.11-1: GCpi ── */}
      <TblWrap title="Coeficientes de Presión Interna GCpi" norm="Tabla 1.11-1">
        <table className="w-full"><thead><tr><th style={th2}>Clasificación</th><th style={th2}>GCpi</th></tr></thead><tbody>
          {Object.entries(T_1_11_1).map(([k, v]) => <tr key={k}><td style={k === r.enclosure ? hl2 : td2}>{k}</td><td style={k === r.enclosure ? hl2 : td2}>±{v.p}</td></tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Tabla 1.12-1: Ke ── */}
      <TblWrap title="Factor de Altitud Ke" norm="Tabla 1.12-1">
        <table className="w-full"><thead><tr><th style={th2}>Alt [m.s.n.m.]</th><th style={th2}>Ke</th></tr></thead><tbody>
          {T_1_12_1.map((row, i) => { const n = Math.abs(row.alt - r.altitude) <= 150; return <tr key={i}><td style={n ? hl2 : td2}>{row.alt}</td><td style={n ? hl2 : td2}>{row.ke.toFixed(2)}</td></tr>; })}
        </tbody></table>
        <Note>Alt={r.altitude}m → Ke=<strong style={{ color: C.ac }}>{r.Ke.toFixed(4)}</strong></Note>
      </TblWrap>

      {/* ── Tabla 1.13-1: Kz ── */}
      <TblWrap title="Coeficientes de Exposición Kz" norm="Tabla 1.13-1">
        <table className="w-full"><thead><tr><th style={th2}>z [m]</th>
          <th style={{ ...th2, ...(r.exp === 'B' ? { color: C.ac } : {}) }}>B</th>
          <th style={{ ...th2, ...(r.exp === 'C' ? { color: C.ac } : {}) }}>C</th>
          <th style={{ ...th2, ...(r.exp === 'D' ? { color: C.ac } : {}) }}>D</th>
        </tr></thead><tbody>
          {T_1_13_1.map((row, i) => { const n = (row.z <= 5 && r.h <= 5) || Math.abs(row.z - r.h) < 2.5; const s3 = n ? hl2 : td2; return <tr key={i}><td style={s3}>{row.z <= 0 ? '0-5' : row.z}</td>
            {['B', 'C', 'D'].map(e => <td key={e} style={e === r.exp && n ? { ...hl2, color: C.ac } : e === r.exp ? { ...s3, color: C.ac } : s3}>{row[e].toFixed(2)}</td>)}</tr>; })}
        </tbody></table>
        <Note>z=h={r.h.toFixed(1)}m Exp.{r.exp} → Kz=<strong style={{ color: C.ac }}>{r.Kz_h.toFixed(4)}</strong></Note>
      </TblWrap>

      {/* ── Tabla 1.14-1: Categorías de Riesgo ── */}
      <TblWrap title="Categorías de Riesgo" norm="Tabla 1.14-1">
        <table className="w-full"><thead><tr><th style={th2}>Cat.</th><th style={th2}>MRI (años)</th><th style={th2}>Col. Vel.</th><th style={th2}>Descripción</th></tr></thead><tbody>
          {Object.entries(CAT_RIESGO).map(([k, v]) => { const isCur = k === inp?.riesgo; return <tr key={k}><td style={isCur ? hl2 : td2}>{k}</td><td style={isCur ? hl2 : td2}>{v.mri}</td><td style={isCur ? hl2 : td2}>{v.col}</td><td style={isCur ? hl2 : td2}>{v.d}</td></tr>; })}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 2.4-1: Cp Paredes ── */}
      <TblWrap title="Coeficientes de Presión Cp — Paredes" norm="Fig. 2.4-1" methods={["dir"]}>
        <table className="w-full"><thead><tr><th style={th2}>Superficie</th><th style={th2}>Cp</th><th style={th2}>Condición</th></tr></thead><tbody>
          <tr><td style={td2}>Pared Barlovento</td><td style={td2}>{CP_WW.toFixed(1)}</td><td style={td2}>Todas las superficies</td></tr>
          {CP_LW_TABLE.map((row, i) => <tr key={i}><td style={td2}>Pared Sotavento</td><td style={td2}>{row.cp.toFixed(1)}</td><td style={td2}>L/B = {row.lb}</td></tr>)}
          <tr><td style={td2}>Paredes Laterales</td><td style={td2}>{CP_LAT.toFixed(1)}</td><td style={td2}>Todas las superficies</td></tr>
        </tbody></table>
        {r?.LB != null && <Note>L/B={r.LB.toFixed(2)} → CpLW=<strong style={{ color: C.ac }}>{r.cpLW?.toFixed(2)}</strong></Note>}
      </TblWrap>

      {/* ── Fig. 2.4-1: Cp Cubierta Normal BV ── */}
      <TblWrap title="Cp Cubierta Barlovento — Normal a Cumbrera (h/L ≤ 0.25)" norm="Fig. 2.4-1" methods={["dir"]}>
        <table className="w-full"><thead><tr><th style={th2}>θ (°)</th><th style={th2}>Cp min</th><th style={th2}>Cp max</th></tr></thead><tbody>
          {CP_ROOF_N_BV_025.map((row, i) => { const near = r?.theta != null && Math.abs(row.t - r.theta * 180 / Math.PI) < 3; return <tr key={i}><td style={near ? hl2 : td2}>{row.t}</td><td style={near ? hl2 : td2}>{row.mn.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.mx.toFixed(2)}</td></tr>; })}
        </tbody></table>
      </TblWrap>

      <TblWrap title="Cp Cubierta Barlovento — Normal a Cumbrera (h/L ≤ 0.5)" norm="Fig. 2.4-1" methods={["dir"]}>
        <table className="w-full"><thead><tr><th style={th2}>θ (°)</th><th style={th2}>Cp min</th><th style={th2}>Cp max</th></tr></thead><tbody>
          {CP_ROOF_N_BV_050.map((row, i) => { const near = r?.theta != null && Math.abs(row.t - r.theta * 180 / Math.PI) < 3; return <tr key={i}><td style={near ? hl2 : td2}>{row.t}</td><td style={near ? hl2 : td2}>{row.mn.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.mx.toFixed(2)}</td></tr>; })}
        </tbody></table>
      </TblWrap>

      <TblWrap title="Cp Cubierta Barlovento — Normal a Cumbrera (h/L ≥ 1.0)" norm="Fig. 2.4-1" methods={["dir"]}>
        <table className="w-full"><thead><tr><th style={th2}>θ (°)</th><th style={th2}>Cp min</th><th style={th2}>Cp max</th></tr></thead><tbody>
          {CP_ROOF_N_BV_100.map((row, i) => { const near = r?.theta != null && Math.abs(row.t - r.theta * 180 / Math.PI) < 3; return <tr key={i}><td style={near ? hl2 : td2}>{row.t}</td><td style={near ? hl2 : td2}>{row.mn.toFixed(2)}</td><td style={near ? hl2 : td2}>{row.mx.toFixed(2)}</td></tr>; })}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 2.4-1: Cp Cubierta SV ── */}
      <TblWrap title="Cp Cubierta Sotavento — Normal a Cumbrera" norm="Fig. 2.4-1" methods={["dir"]}>
        <table className="w-full"><thead><tr><th style={th2}>θ (°)</th><th style={th2}>Cp</th></tr></thead><tbody>
          {CP_ROOF_N_SV.map((row, i) => { const near = r?.theta != null && Math.abs(row.t - r.theta * 180 / Math.PI) < 3; return <tr key={i}><td style={near ? hl2 : td2}>{row.t}</td><td style={near ? hl2 : td2}>{row.cp.toFixed(2)}</td></tr>; })}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 2.4-1: Cp Paralelo ── */}
      <TblWrap title="Cp Cubierta — Paralelo a Cumbrera (h/L ≤ 0.5)" norm="Fig. 2.4-1" methods={["dir"]}>
        <table className="w-full"><thead><tr><th style={th2}>Zona</th><th style={th2}>Cp min</th><th style={th2}>Cp max</th></tr></thead><tbody>
          {CP_ROOF_PAR_05.map((row, i) => <tr key={i}><td style={td2}>{row.z}</td><td style={td2}>{row.mn.toFixed(2)}</td><td style={td2}>{row.mx.toFixed(2)}</td></tr>)}
        </tbody></table>
      </TblWrap>

      <TblWrap title="Cp Cubierta — Paralelo a Cumbrera (h/L ≥ 1.0)" norm="Fig. 2.4-1" methods={["dir"]}>
        <table className="w-full"><thead><tr><th style={th2}>Zona</th><th style={th2}>Cp min</th><th style={th2}>Cp max</th></tr></thead><tbody>
          {CP_ROOF_PAR_10.map((row, i) => <tr key={i}><td style={td2}>{row.z}</td><td style={td2}>{row.mn.toFixed(2)}</td><td style={td2}>{row.mx.toFixed(2)}</td></tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. AC.3-1: Envolvente Caso 1 ── */}
      <TblWrap title="GCpf Envolvente — Caso 1: Viento Transversal" norm="Fig. AC.3-1" methods={["env"]}>
        <table className="w-full"><thead><tr><th style={th2}>θ (°)</th>
          {ENV_ZONES_C1.map(z => <th key={z} style={th2}>{z}</th>)}
        </tr></thead><tbody>
          {GCPF_C1.map((row, i) => { const near = r?.theta != null && Math.abs(row.t - r.theta * 180 / Math.PI) < 3; return <tr key={i}><td style={near ? hl2 : td2}>{row.t}</td>
            {ENV_ZONES_C1.map(z => <td key={z} style={near ? hl2 : td2}>{row.s[z].toFixed(2)}</td>)}
          </tr>; })}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. AC.3-1: Envolvente Caso 2 ── */}
      <TblWrap title="GCpf Envolvente — Caso 2: Viento Longitudinal" norm="Fig. AC.3-1" methods={["env"]}>
        <table className="w-full"><thead><tr><th style={th2}>Zona</th><th style={th2}>GCpf</th><th style={th2}>Descripción</th></tr></thead><tbody>
          {ENV_ZONES_C2.map(z => <tr key={z}><td style={td2}>{z}</td><td style={td2}>{GCPF_C2[z].toFixed(2)}</td><td style={td2}>{ZONE_DESC[z] || ''}</td></tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. AC.3-2: Envolvente Caso 3 ── */}
      <TblWrap title="GCpf Envolvente — Caso 3: Torsional Transversal" norm="Fig. AC.3-2" methods={["env"]}>
        <table className="w-full"><thead><tr><th style={th2}>θ (°)</th>
          {ENV_ZONES_C3.map(z => <th key={z} style={th2}>{z}</th>)}
        </tr></thead><tbody>
          {GCPF_C3.map((row, i) => <tr key={i}><td style={td2}>{row.t}</td>
            {ENV_ZONES_C3.map(z => <td key={z} style={td2}>{row.s[z].toFixed(2)}</td>)}
          </tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. AC.3-2: Envolvente Caso 4 ── */}
      <TblWrap title="GCpf Envolvente — Caso 4: Torsional Longitudinal" norm="Fig. AC.3-2" methods={["env"]}>
        <table className="w-full"><thead><tr><th style={th2}>Zona</th><th style={th2}>GCpf</th><th style={th2}>Descripción</th></tr></thead><tbody>
          {ENV_ZONES_C4.map(z => <tr key={z}><td style={td2}>{z}</td><td style={td2}>{GCPF_C4[z].toFixed(2)}</td><td style={td2}>{ZONE_DESC[z] || ''}</td></tr>)}
        </tbody></table>
      </TblWrap>

      {/* ── Fig. 5.3-1: GCp Paredes C&R ── */}
      <TblWrap title="GCp Componentes — Paredes (Zona 4 y 5)" norm="Fig. 5.3-1" methods={["cr"]}>
        <table className="w-full"><thead><tr>
          <th style={th2}>A [m²]</th>
          <th style={th2}>Z4 GCp+</th><th style={th2}>Z4 GCp−</th>
          <th style={th2}>Z5 GCp+</th><th style={th2}>Z5 GCp−</th>
        </tr></thead><tbody>
          {CR_WALL_Z4.map((row, i) => <tr key={i}>
            <td style={td2}>{row.a}</td>
            <td style={td2}>{row.pos.toFixed(2)}</td>
            <td style={{ ...td2, color: C.neg }}>{row.neg.toFixed(2)}</td>
            <td style={td2}>{CR_WALL_Z5[i].pos.toFixed(2)}</td>
            <td style={{ ...td2, color: C.neg }}>{CR_WALL_Z5[i].neg.toFixed(2)}</td>
          </tr>)}
        </tbody></table>
        <Note>Z4 = pared general (interior) · Z5 = pared borde (franja a) · Interpolación log-lineal en A</Note>
      </TblWrap>

      {/* ── Fig. 5.3-2A: GCp Cubierta θ ≤ 7° ── */}
      <TblWrap title="GCp Componentes — Cubierta θ ≤ 7° (plano/baja pendiente)" norm="Fig. 5.3-2A" methods={["cr"]}>
        <table className="w-full"><thead><tr>
          <th style={th2}>A [m²]</th>
          <th style={th2}>Z1 GCp+</th><th style={th2}>Z1 GCp−</th>
          <th style={th2}>Z2 GCp+</th><th style={th2}>Z2 GCp−</th>
          <th style={th2}>Z3 GCp+</th><th style={th2}>Z3 GCp−</th>
        </tr></thead><tbody>
          {CR_ROOF_A[1].map((row, i) => <tr key={i}>
            <td style={td2}>{row.a}</td>
            <td style={td2}>{row.pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{row.neg.toFixed(2)}</td>
            <td style={td2}>{CR_ROOF_A[2][i].pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{CR_ROOF_A[2][i].neg.toFixed(2)}</td>
            <td style={td2}>{CR_ROOF_A[3][i].pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{CR_ROOF_A[3][i].neg.toFixed(2)}</td>
          </tr>)}
        </tbody></table>
        <Note>Z1 = interior · Z2 = borde (franja a) · Z3 = esquina (a×a)</Note>
      </TblWrap>

      {/* ── Fig. 5.3-2B: GCp Cubierta 7° < θ ≤ 27° ── */}
      <TblWrap title="GCp Componentes — Cubierta 7° < θ ≤ 27°" norm="Fig. 5.3-2B" methods={["cr"]}>
        <table className="w-full"><thead><tr>
          <th style={th2}>A [m²]</th>
          <th style={th2}>Z1 GCp+</th><th style={th2}>Z1 GCp−</th>
          <th style={th2}>Z2 GCp+</th><th style={th2}>Z2 GCp−</th>
          <th style={th2}>Z3 GCp+</th><th style={th2}>Z3 GCp−</th>
        </tr></thead><tbody>
          {CR_ROOF_B[1].map((row, i) => <tr key={i}>
            <td style={td2}>{row.a}</td>
            <td style={td2}>{row.pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{row.neg.toFixed(2)}</td>
            <td style={td2}>{CR_ROOF_B[2][i].pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{CR_ROOF_B[2][i].neg.toFixed(2)}</td>
            <td style={td2}>{CR_ROOF_B[3][i].pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{CR_ROOF_B[3][i].neg.toFixed(2)}</td>
          </tr>)}
        </tbody></table>
        <Note>Z1 = interior · Z2 = borde (franja a) · Z3 = esquina (a×a)</Note>
      </TblWrap>

      {/* ── Fig. 5.3-2C: GCp Cubierta 27° < θ ≤ 45° ── */}
      <TblWrap title="GCp Componentes — Cubierta 27° < θ ≤ 45°" norm="Fig. 5.3-2C" methods={["cr"]}>
        <table className="w-full"><thead><tr>
          <th style={th2}>A [m²]</th>
          <th style={th2}>Z1 GCp+</th><th style={th2}>Z1 GCp−</th>
          <th style={th2}>Z2 GCp+</th><th style={th2}>Z2 GCp−</th>
          <th style={th2}>Z3 GCp+</th><th style={th2}>Z3 GCp−</th>
        </tr></thead><tbody>
          {CR_ROOF_C[1].map((row, i) => <tr key={i}>
            <td style={td2}>{row.a}</td>
            <td style={td2}>{row.pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{row.neg.toFixed(2)}</td>
            <td style={td2}>{CR_ROOF_C[2][i].pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{CR_ROOF_C[2][i].neg.toFixed(2)}</td>
            <td style={td2}>{CR_ROOF_C[3][i].pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{CR_ROOF_C[3][i].neg.toFixed(2)}</td>
          </tr>)}
        </tbody></table>
        <Note>Z1 = interior · Z2 = borde (franja a) · Z3 = esquina (a×a)</Note>
      </TblWrap>

      {/* ── Fig. 5.3-2D: GCp Cubierta θ > 45° ── */}
      <TblWrap title="GCp Componentes — Cubierta θ > 45°" norm="Fig. 5.3-2D" methods={["cr"]}>
        <table className="w-full"><thead><tr>
          <th style={th2}>A [m²]</th>
          <th style={th2}>Z1 GCp+</th><th style={th2}>Z1 GCp−</th>
          <th style={th2}>Z2 GCp+</th><th style={th2}>Z2 GCp−</th>
          <th style={th2}>Z3 GCp+</th><th style={th2}>Z3 GCp−</th>
        </tr></thead><tbody>
          {CR_ROOF_D[1].map((row, i) => <tr key={i}>
            <td style={td2}>{row.a}</td>
            <td style={td2}>{row.pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{row.neg.toFixed(2)}</td>
            <td style={td2}>{CR_ROOF_D[2][i].pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{CR_ROOF_D[2][i].neg.toFixed(2)}</td>
            <td style={td2}>{CR_ROOF_D[3][i].pos.toFixed(2)}</td><td style={{ ...td2, color: C.neg }}>{CR_ROOF_D[3][i].neg.toFixed(2)}</td>
          </tr>)}
        </tbody></table>
        <Note>Z1 = interior · Z2 = borde (franja a) · Z3 = esquina (a×a)</Note>
      </TblWrap>

    </div>
  );
}
