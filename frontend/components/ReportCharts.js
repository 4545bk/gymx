'use client';

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from '@/lib/charts';

const CHART_COLORS = ['#10b981', '#3b82f6', '#22c55e', '#06b6d4', '#ef4444', '#f59e0b'];

export default function ReportCharts({ type, data, formatCurrency }) {
  if (type === 'attendance') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.series.slice(-14)}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={d => d.slice(-5)} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Bar dataKey="granted" fill="#22c55e" radius={[4, 4, 0, 0]} name="Check-ins" />
          <Bar dataKey="denied" fill="#ef4444" radius={[4, 4, 0, 0]} name="Denied" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'revenue') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data.series}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `${(v/100).toLocaleString()}`} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={v => formatCurrency(v)} />
          <Line type="monotone" dataKey="membership" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Membership" />
          <Line type="monotone" dataKey="product" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Products" />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'split') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={[
            { name: 'Membership', value: data.totalMembership },
            { name: 'Products', value: data.totalProduct },
          ]} cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {[0, 1].map(i => <Cell key={i} fill={CHART_COLORS[i]} />)}
          </Pie>
          <Tooltip formatter={v => formatCurrency(v)} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'staff') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis dataKey="fullName" type="category" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Bar dataKey="checkins" fill="#22c55e" name="Check-ins" radius={[0, 4, 4, 0]} />
          <Bar dataKey="sales" fill="#3b82f6" name="Sales" radius={[0, 4, 4, 0]} />
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
