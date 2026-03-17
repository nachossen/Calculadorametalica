/**
 * ui/tabs/TabComparacion.jsx — Comparación Direccional vs Envolvente (mejorado)
 * Tabla detallada por superficie, sin auto-recomendación
 */

import { Badge } from '../common/Badge.jsx';
import { C } from '../common/theme.js';

const th2 = { background: C.bg, color: C.dm, padding: '5px 8px', fontSize: 10, textAlign: 'left', borderBottom: `1px solid ${C.bd}` };
const td2 = { padding: '4px 8px', fontSize: 11, color: C.tx, borderBottom: `1px solid ${C.bd}`, fontFamily: 'monospace' };

export function TabComparacion({ cmpR, envR }) {
  return (
    <div className="space-y-3 max-w-4xl">

      {!envR.isApplicable && (
        <div className="rounded-lg p-4" style={{ background: '#7f1d1d33', border: `1px solid ${C.pos}` }}>
          <div className="text-sm font-bold" style={{ color: C.pos }}>Envolvente no aplicable (h={envR.hRef.toFixed(1)}m &gt; 20m)</div>
          <div className="text-xs mt-1" style={{ color: C.tx }}>Solo se puede usar el Método Direccional (Cap. 2).</div>
        </div>
      )}

      {cmpR.applicable && <>
        {/* Detailed surface table */}
        <div className="rounded-lg overflow-hidden" style={{ background: C.cd, border: `1px solid ${C.bd}` }}>
          <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.bd}` }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.dm }}>Desglose por Superficie</span>
            <Badge>Cap. 2 vs Ap. C</Badge>
          </div>
          <table className="w-full"><thead><tr>
            <th style={th2}>Superficie</th>
            <th style={{ ...th2, textAlign: 'right' }}>Dir. p+ [Pa]</th>
            <th style={{ ...th2, textAlign: 'right' }}>Dir. p− [Pa]</th>
            <th style={{ ...th2, textAlign: 'right' }}>Env. |máx| [Pa]</th>
            <th style={{ ...th2, textAlign: 'center' }}>Δ (%)</th>
          </tr></thead><tbody>
            {cmpR.surfaces.map((s, i) => (
              <tr key={i}>
                <td style={{ ...td2, fontWeight: 'bold' }}>{s.name}</td>
                <td style={{ ...td2, textAlign: 'right', color: s.dirP >= 0 ? C.pos : C.neg }}>
                  {s.dirP >= 0 ? '+' : ''}{s.dirP.toFixed(1)}
                </td>
                <td style={{ ...td2, textAlign: 'right', color: s.dirN >= 0 ? C.pos : C.neg }}>
                  {s.dirN >= 0 ? '+' : ''}{s.dirN.toFixed(1)}
                </td>
                <td style={{ ...td2, textAlign: 'right' }}>
                  {s.envMax != null ? s.envMax.toFixed(1) : <span style={{ color: C.dm }}>—</span>}
                </td>
                <td style={{ ...td2, textAlign: 'center', color: s.delta != null ? (parseFloat(s.delta) < 0 ? C.ok : C.neg) : C.dm }}>
                  {s.delta != null ? `${s.delta}%` : '—'}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr style={{ background: C.bg }}>
              <td style={{ ...td2, fontWeight: 'bold' }}>PARED (máx abs)</td>
              <td colSpan={2} style={{ ...td2, textAlign: 'right', fontWeight: 'bold' }}>{cmpR.dirMaxWall.toFixed(1)}</td>
              <td style={{ ...td2, textAlign: 'right', fontWeight: 'bold' }}>{cmpR.envMaxWall.toFixed(1)}</td>
              <td style={{ ...td2, textAlign: 'center', fontWeight: 'bold', color: cmpR.envMaxWall < cmpR.dirMaxWall ? C.ok : C.neg }}>
                {((cmpR.envMaxWall - cmpR.dirMaxWall) / cmpR.dirMaxWall * 100).toFixed(1)}%
              </td>
            </tr>
            <tr style={{ background: C.bg }}>
              <td style={{ ...td2, fontWeight: 'bold' }}>CUBIERTA (máx abs)</td>
              <td colSpan={2} style={{ ...td2, textAlign: 'right', fontWeight: 'bold' }}>{cmpR.dirMaxRoof.toFixed(1)}</td>
              <td style={{ ...td2, textAlign: 'right', fontWeight: 'bold' }}>{cmpR.envMaxRoof.toFixed(1)}</td>
              <td style={{ ...td2, textAlign: 'center', fontWeight: 'bold', color: cmpR.envMaxRoof < cmpR.dirMaxRoof ? C.ok : C.neg }}>
                {((cmpR.envMaxRoof - cmpR.dirMaxRoof) / cmpR.dirMaxRoof * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody></table>
          <div className="px-3 py-1 text-xs" style={{ color: C.dm, borderTop: `1px solid ${C.bd}` }}>
            Δ negativo = envolvente produce menor carga | Zonas env.: 1/1E→BV, 4→SV, 2/2E→Cub.BV, 3/3E→Cub.SV
          </div>
        </div>

        {/* Analysis section */}
        <div className="rounded-lg p-3" style={{ background: C.cd, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${C.ac}` }}>
          <div className="text-xs font-bold mb-2" style={{ color: C.tx }}>Análisis Comparativo</div>
          <div className="space-y-1.5 text-xs" style={{ color: C.dm }}>
            <div>
              <strong style={{ color: C.tx }}>Diferencia global:</strong>{' '}
              El método {cmpR.cheaper} produce ~{cmpR.savings}% {cmpR.cheaper === 'Envolvente' ? 'menos' : 'más'} carga total que el otro método.
            </div>
            <div>
              <strong style={{ color: C.tx }}>Aplicabilidad:</strong>{' '}
              El Método Direccional (Cap. 2) es aplicable a cualquier edificio. El Envolvente (Ap. C) solo a edificios de baja altura (h ≤ 20 m).
            </div>
            <div>
              <strong style={{ color: C.tx }}>Consideraciones:</strong>{' '}
              La elección del método depende del criterio del ingeniero. El Apéndice C indica que el envolvente generalmente produce presiones menores para edificios de baja altura, pero el método direccional permite mayor control sobre la dirección del viento.
            </div>
          </div>
        </div>
      </>}
    </div>
  );
}
