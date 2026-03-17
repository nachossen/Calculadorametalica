/**
 * ui/tabs/TabTablasUnificado.jsx — Pestaña unificada de Tablas CIRSOC 102-2025
 * Sub-tabs: Todas | Direccional | Envolvente | C&R
 */

import { useState } from 'react';
import { C } from '../common/theme.js';
import { TabTablas } from './TabTablas.jsx';

const SUB_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'dir', label: 'Direccional' },
  { id: 'env', label: 'Envolvente' },
  { id: 'cr',  label: 'C&R' },
];

export function TabTablasUnificado({ r, inp }) {
  const [sub, setSub] = useState('all');

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab bar */}
      <div className="flex gap-1 px-4 py-2 border-b shrink-0" style={{ borderColor: C.bd, background: C.cd }}>
        {SUB_TABS.map(t => (
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

      {/* Content — pass filter to TabTablas */}
      <div className="flex-1 overflow-y-auto">
        <TabTablas r={r} inp={inp} filter={sub} />
      </div>
    </div>
  );
}
