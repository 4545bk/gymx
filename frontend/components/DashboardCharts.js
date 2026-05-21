'use client';

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell
} from '@/lib/charts';

export default function DashboardCharts({ type, data, totalMembers, t }) {
  if (type === 'income') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A5C3A" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#1A5C3A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date" tickLine={false} axisLine={{ stroke: 'var(--border)' }}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={(v) => { const d = v.split('-'); return d[2] || d[1] || v; }}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 13, boxShadow: 'var(--shadow-md)',
            }}
            formatter={(val) => [`ETB ${val.toLocaleString()}`, 'Income']}
            labelFormatter={(l) => l}
          />
          <Area type="monotone" dataKey="income" stroke="#1A5C3A" strokeWidth={2}
            fill="url(#greenGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#1A5C3A' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'status') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <ResponsiveContainer width={170} height={170}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={75}
              paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            {totalMembers}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t ? t('dashboard.total') : 'Total'}</div>
        </div>
      </div>
    );
  }

  return null;
}
