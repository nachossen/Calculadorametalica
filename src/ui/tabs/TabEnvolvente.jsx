/**
 * ui/tabs/TabEnvolvente.jsx — Método Envolvente Apéndice C
 * Sub-tabs: Resumen | 3D | Memoria
 */

import { useState } from 'react';
import { Badge } from '../common/Badge.jsx';
import { Envolvente3D } from '../views/Envolvente3D.jsx';
import { ENV_ZONES_C1, ENV_ZONES_C2, ENV_ZONES_C3, ENV_ZONES_C4, ZONE_DESC } from '../../data/envolventeGCpf.js';
import { C } from '../common/theme.js';
import { CirsocImg } from '../common/CirsocImg.jsx';

const SUB = [
  { id: 'res', label: 'Resumen' },
  { id: '3d',  label: '3D' },
  { id: 'mem', label: 'Memoria' },
];

const th2 = { background: C.bg, color: C.dm, padding: '5px 8px', fontSize: 10, textAlign: 'left', borderBottom: `1px solid ${C.bd}` };
const td2 = { padding: '4px 8px', fontSize: 11, color: C.tx, borderBottom: `1px solid ${C.bd}`, fontFamily: 'monospace' };

/* ── Tabla de un caso ── */
function CaseTable({ title, refText, data, zones, qh, gcpi }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.bd}` }}>
        <span className="text-xs font-bold" style={{ color: C.tx }}>{title}</span>
        <Badge>{refText}</Badge>
      </div>
      <table className="w-full"><thead><tr>
        <th style={th2}>Zona</th><th style={th2}>Descripción</th><th style={th2}>GCpf</th>
        <th style={{ ...th2, textAlign: 'right' }}>p+ [Pa]</th>
        <th style={{ ...th2, textAlign: 'right' }}>p− [Pa]</th>
      </tr></thead><tbody>
        {zones.map(z => { const d = data[z]; if (!d) return null; return <tr key={z}>
          <td style={td2}>{z}</td>
          <td style={{ ...td2, color: C.dm, fontSize: 9 }}>{ZONE_DESC[z] || z}</td>
          <td style={td2}>{d.gcpf.toFixed(2)}</td>
          <td style={{ ...td2, textAlign: 'right', color: d.pPos > 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{d.pPos > 0 ? '+' : ''}{d.pPos.toFixed(1)}</td>
          <td style={{ ...td2, textAlign: 'right', color: d.pNeg > 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{d.pNeg > 0 ? '+' : ''}{d.pNeg.toFixed(1)}</td>
        </tr>; })}
      </tbody></table>
      <div className="px-3 py-1 text-xs" style={{ color: C.dm, borderTop: `1px solid ${C.bd}` }}>
        p = {qh.toFixed(1)} × [(GCpf) − (±{gcpi.p})]
      </div>
    </div>
  );
}

/* ── Step card for Memoria ── */
function Step({ n, title, children }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: C.cd, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${C.ac}` }}>
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.bd}` }}>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: C.ac, color: '#fff' }}>{n}</span>
        <span className="text-xs font-bold" style={{ color: C.tx }}>{title}</span>
      </div>
      <div className="p-3 space-y-1 text-xs">
        {children}
      </div>
    </div>
  );
}

function Sym({ children }) { return <div className="italic" style={{ color: C.dm }}>{children}</div>; }
function Sub({ children }) { return <div className="font-mono" style={{ color: C.tx }}>{children}</div>; }
function Res({ children }) { return <div className="font-mono font-bold" style={{ color: C.ac }}>{children}</div>; }

/* ══════════════════════════════════════════════════════════════ */
export function TabEnvolvente({ envR, inp }) {
  const [sub, setSub] = useState('res');

  return (
    <div className="h-full flex flex-col">
      {/* Applicability banner */}
      {!envR.isApplicable && (
        <div className="m-3 rounded-lg p-4 flex items-center gap-3" style={{ background: '#7f1d1d33', border: `1px solid ${C.pos}` }}>
          <span style={{ color: C.pos, fontSize: 20 }}>⚠</span>
          <div>
            <div className="text-sm font-bold" style={{ color: C.pos }}>No Aplicable</div>
            <div className="text-xs" style={{ color: C.tx }}>
              El Método Envolvente requiere h ≤ 20 m (h actual = {envR.hRef.toFixed(1)} m). Usar Método Direccional (Cap. 2).
            </div>
          </div>
        </div>
      )}

      {envR.isApplicable && <>
        {/* Sub-tab bar */}
        <div className="flex gap-1 px-4 py-2 border-b shrink-0" style={{ borderColor: C.bd, background: C.cd }}>
          {SUB.map(t => (
            <button key={t.id} onClick={() => setSub(t.id)}
              className="px-3 py-1 rounded text-xs font-bold transition-colors"
              style={{
                background: sub === t.id ? C.ac : 'transparent',
                color: sub === t.id ? '#fff' : C.dm,
                border: `1px solid ${sub === t.id ? C.ac : C.bd}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">

          {/* ═══ RESUMEN ═══ */}
          {sub === 'res' && <>
            {/* Intro */}
            <div className="rounded-lg p-3" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge color={C.ac}>Apéndice C</Badge>
                <span className="text-xs font-bold" style={{ color: C.tx }}>Método Envolvente — CIRSOC 102-2025</span>
              </div>
              <div className="text-xs leading-relaxed" style={{ color: C.dm }}>
                Aplicable a edificios de baja altura (h ≤ 20 m). Define presiones mediante coeficientes GCpf
                que combinan efectos de presión externa e interna. Presiones según
                Ec. C.3-1: <span className="font-mono" style={{ color: C.tx }}>p = qh × [(GCpf) − (GCpi)]</span>.
              </div>
            </div>

            {/* Parámetros clave */}
            <div className="rounded-lg p-2 flex items-center gap-3 flex-wrap" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
              <Badge color={C.ok}>Aplicable</Badge>
              <span className="text-xs font-mono" style={{ color: C.dm }}>h = {envR.hRef.toFixed(1)} m</span>
              <span className="text-xs font-mono" style={{ color: C.dm }}>a = {envR.a.toFixed(2)} m</span>
              <span className="text-xs font-mono" style={{ color: C.dm }}>qh = {envR.qh.toFixed(1)} Pa</span>
              <span className="text-xs font-mono" style={{ color: C.dm }}>GCpi = ±{envR.gcpi.p}</span>
              <span className="text-xs font-mono" style={{ color: C.dm }}>θ = {envR.theta.toFixed(1)}°</span>
            </div>

            {/* Nota 8 casos */}
            <div className="rounded-lg p-2.5" style={{ background: '#1e3a5f22', border: `1px solid ${C.bd}` }}>
              <div className="text-xs" style={{ color: C.dm }}>
                <strong style={{ color: C.ac }}>Nota:</strong> Cada caso se evalúa con GCpi positivo y negativo,
                generando <strong style={{ color: C.tx }}>8 condiciones de presión</strong> (4 casos × 2 signos GCpi).
                Las columnas p+ y p− representan estas dos evaluaciones para cada zona.
              </div>
            </div>

            {/* 4 Case tables */}
            {[
              { title: 'Caso 1 — Viento Transversal', refText: 'Fig. AC.3-1', data: envR.c1, zones: ENV_ZONES_C1 },
              { title: 'Caso 2 — Viento Longitudinal', refText: 'Fig. AC.3-1', data: envR.c2, zones: ENV_ZONES_C2 },
              { title: 'Caso 3 — Torsional Transversal', refText: 'Fig. AC.3-2', data: envR.c3, zones: ENV_ZONES_C3 },
              { title: 'Caso 4 — Torsional Longitudinal', refText: 'Fig. AC.3-2', data: envR.c4, zones: ENV_ZONES_C4 },
            ].map((cs, ci) => (
              <CaseTable key={ci} {...cs} qh={envR.qh} gcpi={envR.gcpi} />
            ))}

            {/* Referencia CIRSOC */}
            <CirsocImg src="/cirsoc/image22.png" alt="Tabla C.2-1 Pasos envolvente" title="Referencia: Tabla C.2-1 — Pasos método envolvente" />
            <CirsocImg src="/cirsoc/image23.png" alt="Fig AC.3-1 GCpf casos 1-2" title="Referencia: Fig. AC.3-1 — GCpf Casos 1 y 2 (transversal/longitudinal)" />
            <CirsocImg src="/cirsoc/image24.png" alt="Fig AC.3-2 GCpf casos 3-4" title="Referencia: Fig. AC.3-2 — GCpf Casos 3 y 4 (torsión)" />
            <CirsocImg src="/cirsoc/image25.png" alt="Fig C AC.3-1 Ilustración 3D" title="Referencia: Fig. C AC.3-1 — Ilustración 3D aplicación de cargas" />
          </>}

          {/* ═══ 3D ═══ */}
          {sub === '3d' && <Env3DPanel envR={envR} inp={inp} />}

          {/* ═══ MEMORIA ═══ */}
          {sub === 'mem' && <EnvMemoria envR={envR} />}
        </div>
      </>}
    </div>
  );
}

/* ── 3D panel with case selector ── */
function Env3DPanel({ envR, inp }) {
  const [caso, setCaso] = useState(1);
  const casoNames = ['Transversal', 'Longitudinal', 'Torsional Trans.', 'Torsional Long.'];

  return (
    <>
      {/* Case selector */}
      <div className="flex gap-1 flex-wrap">
        {[1, 2, 3, 4].map(c => (
          <button key={c} onClick={() => setCaso(c)}
            className="px-2.5 py-1 rounded text-xs font-bold transition-colors"
            style={{
              background: caso === c ? C.acd : 'transparent',
              color: caso === c ? '#fff' : C.dm,
              border: `1px solid ${caso === c ? C.ac : C.bd}`,
            }}>
            Caso {c} — {casoNames[c - 1]}
          </button>
        ))}
      </div>

      {/* 3D view */}
      <div className="rounded-lg overflow-hidden" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
        <Envolvente3D envR={envR} inp={inp} caso={caso} />
      </div>

      {/* Quick reference */}
      <div className="rounded-lg p-2.5 text-xs" style={{ background: '#1e3a5f22', border: `1px solid ${C.bd}`, color: C.dm }}>
        Los colores representan el signo del GCpf: <span style={{ color: C.pos }}>rojo = presión (+)</span>,{' '}
        <span style={{ color: C.neg }}>azul = succión (−)</span>. Intensidad proporcional a la magnitud.
        Los valores p+/p− incluyen el efecto de GCpi = ±{envR.gcpi.p}.
      </div>
    </>
  );
}

/* ── Memoria de cálculo ── */
function EnvMemoria({ envR }) {
  return (
    <>
      <Step n="1" title="Verificación de Aplicabilidad">
        <Sym>Método Envolvente: h ≤ 20 m (Ap. C, CIRSOC 102-2025)</Sym>
        <Sub>h = {envR.hRef.toFixed(2)} m {envR.isApplicable ? '≤' : '>'} 20 m</Sub>
        <Res>{envR.isApplicable ? 'APLICABLE' : 'NO APLICABLE'}</Res>
      </Step>

      <Step n="2" title={'Dimensión "a" (Fig. AC.3-1)'}>
        <Sym>a = min(0.1·B, 0.4·h)</Sym>
        <Sym>a ≥ max(0.04·B, 1.0 m)</Sym>
        <Sub>a = min(0.1×B, 0.4×{envR.hRef.toFixed(1)}) = {envR.a.toFixed(3)} m</Sub>
        <Res>a = {envR.a.toFixed(2)} m</Res>
      </Step>

      <Step n="3" title="Presión Dinámica qh">
        <Sym>qh = 0.613 · Kz · Kzt · Kd · Ke · V²</Sym>
        <Sub>Kz(h = {envR.hRef.toFixed(1)} m, Exp. {envR.exp}) = {envR.Kz_env.toFixed(4)}</Sub>
        <Sub>Kzt = {envR.Kzt.toFixed(4)} | Kd = {envR.Kd} | Ke = {envR.Ke.toFixed(4)} | V = {envR.V} m/s</Sub>
        <Sym>= 0.613 × {envR.Kz_env.toFixed(4)} × {envR.Kzt.toFixed(4)} × {envR.Kd} × {envR.Ke.toFixed(4)} × {envR.V}²</Sym>
        <Sub>= 0.613 × {envR.Kz_env.toFixed(4)} × {envR.Kzt.toFixed(4)} × {envR.Kd} × {envR.Ke.toFixed(4)} × {(envR.V * envR.V).toFixed(0)}</Sub>
        <Sub>= {(0.613 * envR.Kz_env * envR.Kzt * envR.Kd * envR.Ke).toFixed(4)} × {(envR.V * envR.V).toFixed(0)}</Sub>
        <Res>qh = {envR.qh.toFixed(2)} Pa</Res>
      </Step>

      <Step n="4" title="Coeficientes GCpf por Zona y Caso">
        <Sym>Interpolados según θ = {envR.theta.toFixed(1)}° de Figuras AC.3-1 y AC.3-2</Sym>
        <div className="text-xs mb-1" style={{ color: C.dm }}>
          Caso 1: {ENV_ZONES_C1.length} zonas (transversal) · Caso 2: {ENV_ZONES_C2.length} zonas (longitudinal)
          {' · '}Caso 3: {ENV_ZONES_C3.length} zonas (torsional trans.) · Caso 4: {ENV_ZONES_C4.length} zonas (torsional long.)
        </div>

        {/* GCpf table for Case 1 (interpolated) */}
        <div className="text-xs font-bold mt-1" style={{ color: C.tx }}>Caso 1 — GCpf interpolados (θ = {envR.theta.toFixed(1)}°)</div>
        <table className="w-full mt-0.5 text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Zona', 'GCpf', 'Descripción'].map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '3px 6px', color: C.dm, borderBottom: `1px solid ${C.bd}`, fontSize: 10 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {ENV_ZONES_C1.map(z => {
              const d = envR.c1[z]; if (!d) return null;
              return <tr key={z}>
                <td style={{ padding: '2px 6px', borderBottom: `1px solid ${C.bd}`, color: C.tx, fontWeight: 'bold' }}>{z}</td>
                <td style={{ padding: '2px 6px', borderBottom: `1px solid ${C.bd}`, color: d.gcpf >= 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{d.gcpf >= 0 ? '+' : ''}{d.gcpf.toFixed(2)}</td>
                <td style={{ padding: '2px 6px', borderBottom: `1px solid ${C.bd}`, color: C.dm, fontSize: 9 }}>{ZONE_DESC[z]}</td>
              </tr>;
            })}
          </tbody>
        </table>

        {/* Case 2 (constant) */}
        <div className="text-xs font-bold mt-2" style={{ color: C.tx }}>Caso 2 — GCpf constantes (independientes de θ)</div>
        <table className="w-full mt-0.5 text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Zona', 'GCpf', 'Descripción'].map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '3px 6px', color: C.dm, borderBottom: `1px solid ${C.bd}`, fontSize: 10 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {ENV_ZONES_C2.map(z => {
              const d = envR.c2[z]; if (!d) return null;
              return <tr key={z}>
                <td style={{ padding: '2px 6px', borderBottom: `1px solid ${C.bd}`, color: C.tx, fontWeight: 'bold' }}>{z}</td>
                <td style={{ padding: '2px 6px', borderBottom: `1px solid ${C.bd}`, color: d.gcpf >= 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{d.gcpf >= 0 ? '+' : ''}{d.gcpf.toFixed(2)}</td>
                <td style={{ padding: '2px 6px', borderBottom: `1px solid ${C.bd}`, color: C.dm, fontSize: 9 }}>{ZONE_DESC[z]}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </Step>

      <Step n="5" title="Presiones de Diseño (Ec. C.3-1)">
        <Sym>p = qh × [(GCpf) − (±GCpi)]</Sym>
        <Sub>qh = {envR.qh.toFixed(2)} Pa | GCpi = ±{envR.gcpi.p} ({envR.gcpi.p === 0 ? 'Abierto' : envR.gcpi.p === 0.18 ? 'Cerrado' : 'Parc. abierto'})</Sub>
        <div className="text-xs font-mono" style={{ color: C.dm }}>
          p+ = qh × (GCpf − ({envR.gcpi.n})) → mayor presión positiva
        </div>
        <div className="text-xs font-mono" style={{ color: C.dm }}>
          p− = qh × (GCpf − (+{envR.gcpi.p})) → mayor succión
        </div>

        {/* Example development for Case 1 key zones */}
        <div className="text-xs font-bold mt-2" style={{ color: C.tx }}>Desarrollo numérico — Caso 1 (Transversal)</div>
        {['1', '2', '3', '4'].map(z => {
          const d = envR.c1[z]; if (!d) return null;
          return (
            <div key={z} className="mt-1 p-1.5 rounded" style={{ background: '#0a0e17', border: `1px solid ${C.bd}` }}>
              <div className="text-xs font-bold" style={{ color: C.tx }}>Zona {z} — {ZONE_DESC[z]} (GCpf = {d.gcpf >= 0 ? '+' : ''}{d.gcpf.toFixed(2)})</div>
              <div className="text-xs font-mono" style={{ color: C.dm }}>
                p+ = {envR.qh.toFixed(1)} × [{d.gcpf >= 0 ? '+' : ''}{d.gcpf.toFixed(2)} − ({envR.gcpi.n})] = {envR.qh.toFixed(1)} × {(d.gcpf - envR.gcpi.n).toFixed(2)} = <span style={{ color: d.pPos >= 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{d.pPos > 0 ? '+' : ''}{d.pPos.toFixed(1)} Pa</span>
              </div>
              <div className="text-xs font-mono" style={{ color: C.dm }}>
                p− = {envR.qh.toFixed(1)} × [{d.gcpf >= 0 ? '+' : ''}{d.gcpf.toFixed(2)} − (+{envR.gcpi.p})] = {envR.qh.toFixed(1)} × {(d.gcpf - envR.gcpi.p).toFixed(2)} = <span style={{ color: d.pNeg >= 0 ? C.pos : C.neg, fontWeight: 'bold' }}>{d.pNeg > 0 ? '+' : ''}{d.pNeg.toFixed(1)} Pa</span>
              </div>
            </div>
          );
        })}
      </Step>

      <Step n="6" title="Presiones Gobernantes por Superficie">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th style={th2}>Superficie</th>
              <th style={{ ...th2, textAlign: 'right' }}>|p|max [Pa]</th>
            </tr></thead>
            <tbody>
              {[
                { lb: 'Pared BV', v: envR.envMax.wallBV },
                { lb: 'Pared SV', v: envR.envMax.wallSV },
                { lb: 'Cubierta BV', v: envR.envMax.roofBV },
                { lb: 'Cubierta SV', v: envR.envMax.roofSV },
              ].map(row => (
                <tr key={row.lb}>
                  <td style={td2}>{row.lb}</td>
                  <td style={{ ...td2, textAlign: 'right', fontWeight: 'bold', color: C.ac }}>{row.v.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Step>
    </>
  );
}
