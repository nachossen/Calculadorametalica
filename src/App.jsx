/**
 * App.jsx — Shell launcher CIRSOC 101/102
 */

import { useState, lazy, Suspense } from 'react';
import { Wind, Weight, Factory, ArrowLeft } from 'lucide-react';
import { C } from './ui/common/theme.js';

const App102 = lazy(() => import('./App102.jsx'));
const App101 = lazy(() => import('./App101.jsx'));
const App301 = lazy(() => import('./App301.jsx'));

function Loader() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-sky-400 border-gray-700 rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm" style={{ color: C.dm }}>Cargando...</div>
      </div>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, subtitle, desc, onClick, color }) {
  return (
    <button onClick={onClick}
      className="group flex flex-col items-center gap-4 p-8 rounded-2xl transition-all duration-200 hover:scale-[1.02] w-full max-w-sm"
      style={{
        background: C.cd,
        border: `1px solid ${C.bd}`,
        boxShadow: '0 4px 24px rgba(0,0,0,.3)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 32px ${color}33`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,.3)'; }}>
      <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
        <Icon size={32} style={{ color }} />
      </div>
      <div className="text-center">
        <div className="text-lg font-bold" style={{ color: C.tx }}>{title}</div>
        <div className="text-sm font-mono mt-0.5" style={{ color }}>{subtitle}</div>
        <div className="text-xs mt-3 leading-relaxed" style={{ color: C.dm }}>{desc}</div>
      </div>
    </button>
  );
}

export default function App() {
  const [module, setModule] = useState(null);

  // If a module is selected, render it
  if (module) {
    return (
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: C.bg, color: C.tx }}>
        {/* Module header with back button */}
        <header className="flex items-center gap-3 px-4 py-2 border-b shrink-0" style={{ borderColor: C.bd, background: C.bg }}>
          <button onClick={() => setModule(null)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:bg-gray-800"
            style={{ color: C.dm }}>
            <ArrowLeft size={14} />
            Volver
          </button>
          <div className="w-px h-5" style={{ background: C.bd }} />
          {module === '102' ? (
            <>
              <Wind size={18} style={{ color: '#38bdf8' }} />
              <span className="font-semibold text-sm" style={{ color: C.tx }}>CIRSOC 102-2025</span>
              <span className="text-xs" style={{ color: C.dm }}>Presiones de Viento</span>
            </>
          ) : module === '301' ? (
            <>
              <Factory size={18} style={{ color: '#f59e0b' }} />
              <span className="font-semibold text-sm" style={{ color: C.tx }}>CIRSOC 301-2018</span>
              <span className="text-xs" style={{ color: C.dm }}>Predimensionado de Naves</span>
            </>
          ) : (
            <>
              <Weight size={18} style={{ color: '#a78bfa' }} />
              <span className="font-semibold text-sm" style={{ color: C.tx }}>CIRSOC 101-2025</span>
              <span className="text-xs" style={{ color: C.dm }}>Cargas y Combinaciones</span>
            </>
          )}
        </header>

        {/* Module content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Suspense fallback={<Loader />}>
            {module === '102' ? <App102 /> : module === '301' ? <App301 /> : <App101 />}
          </Suspense>
        </div>
      </div>
    );
  }

  // Landing page
  return (
    <div className="flex flex-col items-center justify-center h-screen px-4" style={{ background: C.bg }}>
      <div className="text-center mb-10">
        <div className="text-3xl font-bold tracking-wide" style={{ color: C.tx }}>CIRSOC 2025</div>
        <div className="text-sm mt-2" style={{ color: C.dm }}>Reglamentos Argentinos para la Construcción</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <ModuleCard
          icon={Weight}
          title="CIRSOC 101"
          subtitle="Cargas y Combinaciones"
          desc="Carga muerta, sobrecargas de uso con reducción, sobrecarga de techo, combinaciones LRFD y ASD"
          onClick={() => setModule('101')}
          color="#a78bfa"
        />
        <ModuleCard
          icon={Wind}
          title="CIRSOC 102"
          subtitle="Presiones de Viento"
          desc="Método direccional, envolvente, componentes y revestimientos, vistas 2D/3D"
          onClick={() => setModule('102')}
          color="#38bdf8"
        />
        <ModuleCard
          icon={Factory}
          title="CIRSOC 301"
          subtitle="Predimensionado de Naves"
          desc="Pórticos a dos aguas, perfiles W F36, verificación H1, flecha, fundaciones, tabla de materiales"
          onClick={() => setModule('301')}
          color="#f59e0b"
        />
      </div>

      <div className="mt-10 text-xs" style={{ color: C.dm }}>
        v8.0.0 — Método Direccional + Envolvente + C&R + Combinaciones
      </div>
    </div>
  );
}
