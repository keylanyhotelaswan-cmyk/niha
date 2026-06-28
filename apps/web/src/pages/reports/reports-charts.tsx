import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const INK = '#2C3330';
const MUTED = '#7A837E';
const GRID = 'rgba(44, 51, 48, 0.07)';
const FILL = 'rgba(90, 117, 104, 0.75)';
const FILL_LIGHT = 'rgba(107, 134, 120, 0.45)';

function ChartShell({ height = 240, empty, children }: { height?: number; empty?: boolean; children: ReactNode }) {
  if (empty) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        لا توجد بيانات للرسم.
      </Typography>
    );
  }
  return (
    <Box sx={{ width: '100%', height, direction: 'ltr' }}>
      {children}
    </Box>
  );
}

function fmtTooltip(v: number) {
  return `${v.toLocaleString('en-US')} ج.م`;
}

type NamedValue = { name: string; value: number };

export function HorizontalBarChart({ data, height = 260 }: { data: NamedValue[]; height?: number }) {
  const rows = data.filter((d) => d.value > 0).slice(0, 8);
  return (
    <ChartShell height={Math.max(height, rows.length * 36)} empty={!rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: INK, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [fmtTooltip(Number(v ?? 0)), '']}
            contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {rows.map((_, i) => (
              <Cell key={i} fill={i === 0 ? INK : FILL_LIGHT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function WeeklySalesChart({
  data,
}: {
  data: Array<{ label: string; sales: number; orders: number }>;
}) {
  const rows = [...data].reverse();
  return (
    <ChartShell height={260} empty={!rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={INK} stopOpacity={0.18} />
              <stop offset="100%" stopColor={INK} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(v, key) => [
              key === 'sales' ? fmtTooltip(Number(v ?? 0)) : Number(v ?? 0).toLocaleString('en-US'),
              key === 'sales' ? 'المبيعات' : 'فواتير',
            ]}
            contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 }}
          />
          <Area type="monotone" dataKey="sales" stroke={INK} strokeWidth={2} fill="url(#salesGrad)" dot={{ r: 3, fill: INK }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function DayOfWeekChart({ data }: { data: NamedValue[] }) {
  return (
    <ChartShell height={240} empty={!data.some((d) => d.value > 0)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => [fmtTooltip(Number(v ?? 0)), 'الإيراد']} contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 }} />
          <Bar dataKey="value" fill={FILL} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ShiftSalesChart({
  data,
}: {
  data: Array<{ label: string; sales: number }>;
}) {
  const rows = [...data].reverse().slice(-12);
  return (
    <ChartShell height={260} empty={!rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => [fmtTooltip(Number(v ?? 0)), 'مبيعات']} contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 }} />
          <Bar dataKey="sales" fill={FILL} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
