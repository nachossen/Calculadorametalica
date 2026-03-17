/**
 * MaterialTable.jsx — Tabla resumen de materiales y costos
 */
import { C } from '../../ui/common/theme.js';

/**
 * @param {{ geo, perfilCol, perfilRaf, correa, costInp }} props
 */
export function MaterialTable({ geo, perfilCol, perfilRaf, correa, costInp }) {
  const { B, L, he, hc, nPorticos, sepCorreas } = geo;
  const sep = L / (nPorticos - 1);
  const Lrafter = Math.sqrt((B / 2) ** 2 + (hc - he) ** 2);
  const Lcolumna = he;
  const areaPlanta = B * L;

  // Cantidad de elementos
  const nColumnas = nPorticos * 2;
  const nRafters = nPorticos * 2; // 2 por pórtico (izq + der)

  // Correas por faldón
  const nCorreasPorFaldon = Math.max(2, Math.round(Lrafter / sepCorreas)) + 1; // +1 en cumbrera compartida
  const nCorreas = nCorreasPorFaldon * 2 - 1; // descontar cumbrera compartida
  const largoCorrea = sep; // luz de correa = separación pórticos

  // Chapa: área total de cubierta
  const areaCubierta = Lrafter * 2 * L;

  // Pesos
  const pesoColumnas = nColumnas * Lcolumna * (perfilCol?.peso || 0);
  const pesoRafters = nRafters * Lrafter * (perfilRaf?.peso || 0);
  const pesoCorreas = nCorreas * (nPorticos - 1) * largoCorrea * (correa?.peso || 6);
  const pesoChapa = areaCubierta * 5.5; // ~5.5 kg/m² chapa TR-101 #25

  const pesoTotal = pesoColumnas + pesoRafters + pesoCorreas + pesoChapa;
  const kgM2 = pesoTotal / areaPlanta;

  // Costos
  const precioAcero = costInp?.precioAceroKg || 0;
  const precioChapa = costInp?.precioChapaKg || precioAcero;
  const costoAcero = (pesoColumnas + pesoRafters) * precioAcero;
  const costoCorreas = pesoCorreas * precioAcero;
  const costoChapa = pesoChapa * precioChapa;
  const costoTotal = costoAcero + costoCorreas + costoChapa;
  const usdM2 = costoTotal / areaPlanta;

  const rows = [
    { elem: 'Columnas', perfil: perfilCol?.nombre || '—', cant: nColumnas, largo: Lcolumna.toFixed(1), pesoUn: perfilCol?.peso?.toFixed(1) || '—', pesoTot: pesoColumnas },
    { elem: 'Rafters', perfil: perfilRaf?.nombre || '—', cant: nRafters, largo: Lrafter.toFixed(1), pesoUn: perfilRaf?.peso?.toFixed(1) || '—', pesoTot: pesoRafters },
    { elem: 'Correas', perfil: correa?.nombre || 'C est.', cant: nCorreas * (nPorticos - 1), largo: largoCorrea.toFixed(1), pesoUn: (correa?.peso || 6).toFixed(1), pesoTot: pesoCorreas },
    { elem: 'Chapa cubierta', perfil: 'TR-101 #25', cant: '—', largo: '—', pesoUn: '5.5', pesoTot: pesoChapa },
  ];

  const cellStyle = { padding: '6px 8px', borderBottom: `1px solid ${C.bd}` };
  const headStyle = { ...cellStyle, color: C.dm, fontSize: 10, fontWeight: 600, textAlign: 'left' };
  const dataStyle = { ...cellStyle, color: C.tx, fontSize: 11 };
  const numStyle = { ...dataStyle, textAlign: 'right', fontFamily: 'monospace' };

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.bd}`, borderRadius: 6 }}>
        <thead>
          <tr style={{ background: C.sb }}>
            <th style={headStyle}>Elemento</th>
            <th style={headStyle}>Perfil</th>
            <th style={{ ...headStyle, textAlign: 'right' }}>Cant.</th>
            <th style={{ ...headStyle, textAlign: 'right' }}>Largo [m]</th>
            <th style={{ ...headStyle, textAlign: 'right' }}>kg/m</th>
            <th style={{ ...headStyle, textAlign: 'right' }}>Peso [kg]</th>
            {precioAcero > 0 && <th style={{ ...headStyle, textAlign: 'right' }}>Costo [USD]</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? C.cd : 'transparent' }}>
              <td style={dataStyle}>{r.elem}</td>
              <td style={{ ...dataStyle, fontSize: 10, color: C.ok }}>{r.perfil}</td>
              <td style={numStyle}>{r.cant}</td>
              <td style={numStyle}>{r.largo}</td>
              <td style={numStyle}>{r.pesoUn}</td>
              <td style={{ ...numStyle, fontWeight: 600 }}>{Math.round(r.pesoTot).toLocaleString()}</td>
              {precioAcero > 0 && (
                <td style={numStyle}>
                  {i === 3
                    ? Math.round(costoChapa).toLocaleString()
                    : Math.round(r.pesoTot * precioAcero).toLocaleString()
                  }
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: `${C.ac}15` }}>
            <td colSpan={5} style={{ ...dataStyle, fontWeight: 700, color: C.ac }}>Total acero</td>
            <td style={{ ...numStyle, fontWeight: 700, color: C.ac }}>
              {Math.round(pesoTotal).toLocaleString()} kg
            </td>
            {precioAcero > 0 && (
              <td style={{ ...numStyle, fontWeight: 700, color: C.ac }}>
                {Math.round(costoTotal).toLocaleString()}
              </td>
            )}
          </tr>
          <tr style={{ background: `${C.ok}10` }}>
            <td colSpan={5} style={{ ...dataStyle, fontWeight: 700, color: C.ok }}>kg/m² (planta)</td>
            <td style={{ ...numStyle, fontWeight: 700, color: C.ok }}>
              {kgM2.toFixed(1)} kg/m²
            </td>
            {precioAcero > 0 && (
              <td style={{ ...numStyle, fontWeight: 700, color: C.ok }}>
                {usdM2.toFixed(1)} USD/m²
              </td>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
