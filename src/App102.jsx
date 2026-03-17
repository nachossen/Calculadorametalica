/**
 * App102.jsx — Módulo CIRSOC 102-2025 (Presiones de Viento)
 */

import { useState } from 'react';
import { Wind, BarChart2, Layers, BookOpen, Table2, Sliders, GitCompare, PanelTop, Compass, FileCode } from 'lucide-react';
import { useInputs } from './hooks/useInputs.js';
import { useCalc } from './hooks/useCalc.js';
import { Sidebar } from './ui/Sidebar.jsx';
import { TabResumen } from './ui/tabs/TabResumen.jsx';
import { TabMemoria } from './ui/tabs/TabMemoria.jsx';
import { TabTablas } from './ui/tabs/TabTablas.jsx';
import { TabTablasUnificado } from './ui/tabs/TabTablasUnificado.jsx';
import { TabEnvolvente } from './ui/tabs/TabEnvolvente.jsx';
import { TabComparacion } from './ui/tabs/TabComparacion.jsx';
import { TabComponentes } from './ui/tabs/TabComponentes.jsx';
import { ProfileQz } from './ui/views/ProfileQz.jsx';
import { TabStaadExport } from './ui/tabs/TabStaadExport.jsx';
import { C } from './ui/common/theme.js';

/** Pestañas de método */
const MT = [
  { id: 'dir', label: 'Método Direccional', icon: Wind },
  { id: 'env', label: 'Envolvente (Ap. C)', icon: Layers },
  { id: 'cmp', label: 'Comparación', icon: GitCompare },
  { id: 'cr', label: 'Comp. y Revest.', icon: PanelTop },
  { id: 'tab', label: 'Tablas', icon: Table2 },
  { id: 'staad', label: 'STAAD Pro', icon: FileCode },
];

/** Pestañas de contenido (para Direccional) */
const CT = [
  { id: 'main', label: 'Resumen', icon: BarChart2 },
  { id: 'qz',   label: 'Perfil qz', icon: BarChart2 },
  { id: 'mem',  label: 'Memoria', icon: BookOpen },
];

export default function App102() {
  const [inp, setI] = useInputs();
  const { r, envR, cmpR, crR } = useCalc(inp);

  const [methodTab, setMethodTab] = useState('dir');
  const [contentTab, setContentTab] = useState('main');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full bg-gray-950 text-gray-100 overflow-hidden font-sans">

      {/* ── Sidebar ── */}
      <Sidebar
        inp={inp}
        setI={setI}
        r={r}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <header className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
          <Wind size={20} className="text-sky-400" />
          <span className="font-semibold text-gray-100 tracking-wide">CIRSOC 102-2025</span>
          <span className="text-gray-500 text-sm hidden sm:inline">Presiones de Viento</span>
          <div className="ml-auto flex items-center gap-1">
            {r?.V && (
              <span className="text-xs bg-gray-800 text-sky-300 px-2 py-0.5 rounded font-mono">
                V = {r.V} m/s
              </span>
            )}
            {r?.qh && (
              <span className="text-xs bg-gray-800 text-amber-300 px-2 py-0.5 rounded font-mono">
                qh = {r.qh.toFixed(3)} kN/m²
              </span>
            )}
          </div>
        </header>

        {/* ── Method tabs ── */}
        <div className="flex border-b border-gray-800 bg-gray-900 shrink-0 overflow-x-auto">
          {MT.map(({ id, label, icon: Icon, disabled }) => (
            <button
              key={id}
              disabled={disabled}
              onClick={() => !disabled && setMethodTab(id)}
              className={[
                'flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors',
                disabled
                  ? 'text-gray-600 cursor-not-allowed border-transparent'
                  : methodTab === id
                    ? 'text-sky-400 border-sky-500 bg-gray-800/50'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30',
              ].join(' ')}
            >
              <Icon size={14} />
              {label}
              {disabled && (
                <span className="text-[10px] bg-gray-700 text-gray-500 px-1 rounded">próx.</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content area ── */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Envolvente */}
          {methodTab === 'env' && (
            <div className="flex-1 min-h-0 flex flex-col">
              <TabEnvolvente envR={envR} inp={inp} />
            </div>
          )}

          {/* Comparación */}
          {methodTab === 'cmp' && (
            <div className="flex-1 overflow-y-auto p-4">
              <TabComparacion envR={envR} cmpR={cmpR} />
            </div>
          )}

          {/* Componentes y Revestimientos */}
          {methodTab === 'cr' && (
            <div className="flex-1 overflow-y-auto">
              <TabComponentes crR={crR} inp={inp} setI={setI} />
            </div>
          )}

          {/* Tablas unificadas */}
          {methodTab === 'tab' && (
            <div className="flex-1 overflow-y-auto">
              <TabTablasUnificado r={r} inp={inp} />
            </div>
          )}

          {/* STAAD Pro Export */}
          {methodTab === 'staad' && (
            <div className="flex-1 overflow-y-auto">
              <TabStaadExport r={r} envR={envR} />
            </div>
          )}

          {/* Direccional — sub-tabs */}
          {methodTab === 'dir' && (
            <>
              {/* Content sub-tabs */}
              <div className="flex border-b border-gray-800 bg-gray-900 shrink-0 overflow-x-auto">
                {CT.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setContentTab(id)}
                    className={[
                      'flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors',
                      contentTab === id
                        ? 'text-sky-400 border-sky-500 bg-gray-800/40'
                        : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/20',
                    ].join(' ')}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Wind direction bar */}
              <div className="flex items-center gap-3 px-4 py-1.5 border-b border-gray-800 bg-gray-900/80 shrink-0 flex-wrap">
                <Compass size={14} style={{ color: C.ac }} />
                <span className="text-xs font-bold" style={{ color: C.dm }}>DIRECCIÓN</span>
                <span className="text-xs" style={{ color: C.dm }}>{r?.isNorm ? '⊥ Normal' : '∥ Paralelo'}</span>
                <div className="flex gap-1">
                  {[0, 90, 180, 270].map(a => (
                    <button key={a} onClick={() => setI(p => ({ ...p, windAngle: a }))}
                      className="px-3 py-1 rounded text-sm font-mono font-bold transition-colors"
                      style={{
                        background: inp.windAngle === a ? C.ac : C.bg,
                        color: inp.windAngle === a ? '#fff' : C.dm,
                        border: `1px solid ${inp.windAngle === a ? C.ac : C.bd}`,
                        boxShadow: inp.windAngle === a ? `0 0 8px ${C.ac}44` : 'none'
                      }}>
                      {a}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Content panel */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {contentTab === 'main' && <TabResumen r={r} inp={inp} setI={setI} />}
                {contentTab === 'qz'   && (
                  <div className="p-4">
                    {r?.qzProf ? (
                      <ProfileQz r={r} />
                    ) : (
                      <div className="text-gray-600 text-sm">Sin perfil calculado.</div>
                    )}
                  </div>
                )}
                {contentTab === 'mem' && <TabMemoria r={r} goTab={setContentTab} />}
              </div>
            </>
          )}
        </div>

        {/* ── Status bar ── */}
        <footer className="flex items-center gap-3 px-4 py-1 border-t border-gray-800 bg-gray-900 text-xs text-gray-600 shrink-0">
          <span>CIRSOC 102-2025</span>
          <span className="text-gray-700">·</span>
          <span>{inp.localidad || '—'}</span>
          {r?.theta != null && (
            <>
              <span className="text-gray-700">·</span>
              <span>θ = {r.theta.toFixed(1)}°</span>
            </>
          )}
          {r?.G != null && (
            <>
              <span className="text-gray-700">·</span>
              <span>G = {r.G.toFixed(2)}</span>
            </>
          )}
          <span className="ml-auto">v8.0.0</span>
        </footer>
      </div>
    </div>
  );
}
