import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { C } from '../common/theme.js';

/** Gráfico del perfil de presión dinámica qz(z) */
export function ProfileQz({ r }) {
  const raw = r.qzProf.map(p => ({ z: p.z, qz: Math.round(p.qz * 10) / 10 }));
  if (!raw.find(d => d.z === 0)) raw.unshift({ z: 0, qz: raw[0]?.qz || 0 });
  const data = raw.sort((a, b) => a.z - b.z);
  const maxZ = Math.max(...data.map(d => d.z), r.hc + 2);

  return (
    <div style={{ height: 380 }}>
      <ResponsiveContainer>
        <LineChart data={data} layout="vertical" margin={{ top: 20, right: 35, bottom: 30, left: 15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
          <XAxis type="number" dataKey="qz" stroke={C.dm} tick={{ fontSize: 10, fill: C.dm }}
            domain={[0, 'dataMax']} allowDecimals={false}
            label={{ value: 'qz [Pa]', position: 'insideBottom', offset: -15, fill: C.dm, fontSize: 11 }} />
          <YAxis type="number" dataKey="z" stroke={C.dm} tick={{ fontSize: 10, fill: C.dm }}
            domain={[0, Math.ceil(maxZ / 5) * 5]} reversed={false} allowDecimals={false}
            label={{ value: 'z [m]', angle: -90, position: 'insideLeft', offset: 0, fill: C.dm, fontSize: 11 }} />
          <Tooltip contentStyle={{ background: C.cd, border: `1px solid ${C.bd}`, color: C.tx, fontSize: 11 }}
            formatter={v => [`${v.toFixed(1)} Pa`, 'qz']} labelFormatter={v => `z = ${v} m`} />
          <ReferenceLine y={r.he} stroke={C.w} strokeDasharray="4 3"
            label={{ value: `he=${r.he}m`, fill: C.w, fontSize: 9, position: 'right' }} />
          <ReferenceLine y={r.h} stroke={C.ok} strokeDasharray="4 3"
            label={{ value: `h=${r.h.toFixed(1)}m`, fill: C.ok, fontSize: 9, position: 'right' }} />
          <Line type="monotone" dataKey="qz" stroke={C.ac} strokeWidth={2.5}
            dot={{ fill: C.ac, r: 3 }} activeDot={{ r: 5, stroke: C.ac, strokeWidth: 2, fill: C.bg }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
