import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography } from '@mui/material';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
const INK = '#2C3330';
const MUTED = '#7A837E';
const GRID = 'rgba(44, 51, 48, 0.07)';
const FILL = 'rgba(90, 117, 104, 0.75)';
const FILL_LIGHT = 'rgba(107, 134, 120, 0.45)';
function ChartShell({ height = 240, empty, children }) {
    if (empty) {
        return (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { py: 4, textAlign: 'center' }, children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u0631\u0633\u0645." }));
    }
    return (_jsx(Box, { sx: { width: '100%', height, direction: 'ltr' }, children: children }));
}
function fmtTooltip(v) {
    return `${v.toLocaleString('en-US')} ج.م`;
}
export function HorizontalBarChart({ data, height = 260 }) {
    const rows = data.filter((d) => d.value > 0).slice(0, 8);
    return (_jsx(ChartShell, { height: Math.max(height, rows.length * 36), empty: !rows.length, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: rows, layout: "vertical", margin: { top: 4, right: 12, left: 4, bottom: 4 }, children: [_jsx(CartesianGrid, { stroke: GRID, horizontal: false }), _jsx(XAxis, { type: "number", tick: { fill: MUTED, fontSize: 11 }, axisLine: false, tickLine: false, tickFormatter: (v) => `${(v / 1000).toFixed(0)}k` }), _jsx(YAxis, { type: "category", dataKey: "name", width: 100, tick: { fill: INK, fontSize: 12 }, axisLine: false, tickLine: false }), _jsx(Tooltip, { formatter: (v) => [fmtTooltip(Number(v ?? 0)), ''], contentStyle: { borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 } }), _jsx(Bar, { dataKey: "value", radius: [0, 4, 4, 0], maxBarSize: 22, children: rows.map((_, i) => (_jsx(Cell, { fill: i === 0 ? INK : FILL_LIGHT }, i))) })] }) }) }));
}
export function WeeklySalesChart({ data, }) {
    const rows = [...data].reverse();
    return (_jsx(ChartShell, { height: 260, empty: !rows.length, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: rows, margin: { top: 8, right: 8, left: 0, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "salesGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: INK, stopOpacity: 0.18 }), _jsx("stop", { offset: "100%", stopColor: INK, stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { stroke: GRID, vertical: false }), _jsx(XAxis, { dataKey: "label", tick: { fill: MUTED, fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(YAxis, { tick: { fill: MUTED, fontSize: 11 }, axisLine: false, tickLine: false, tickFormatter: (v) => `${(v / 1000).toFixed(0)}k` }), _jsx(Tooltip, { formatter: (v, key) => [
                            key === 'sales' ? fmtTooltip(Number(v ?? 0)) : Number(v ?? 0).toLocaleString('en-US'),
                            key === 'sales' ? 'المبيعات' : 'فواتير',
                        ], contentStyle: { borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 } }), _jsx(Area, { type: "monotone", dataKey: "sales", stroke: INK, strokeWidth: 2, fill: "url(#salesGrad)", dot: { r: 3, fill: INK } })] }) }) }));
}
export function DayOfWeekChart({ data }) {
    return (_jsx(ChartShell, { height: 240, empty: !data.some((d) => d.value > 0), children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: data, margin: { top: 8, right: 8, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { stroke: GRID, vertical: false }), _jsx(XAxis, { dataKey: "name", tick: { fill: MUTED, fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(YAxis, { tick: { fill: MUTED, fontSize: 11 }, axisLine: false, tickLine: false, tickFormatter: (v) => `${(v / 1000).toFixed(0)}k` }), _jsx(Tooltip, { formatter: (v) => [fmtTooltip(Number(v ?? 0)), 'الإيراد'], contentStyle: { borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 } }), _jsx(Bar, { dataKey: "value", fill: FILL, radius: [4, 4, 0, 0], maxBarSize: 40 })] }) }) }));
}
export function ShiftSalesChart({ data, }) {
    const rows = [...data].reverse().slice(-12);
    return (_jsx(ChartShell, { height: 260, empty: !rows.length, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: rows, margin: { top: 8, right: 8, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { stroke: GRID, vertical: false }), _jsx(XAxis, { dataKey: "label", tick: { fill: MUTED, fontSize: 10 }, axisLine: false, tickLine: false, interval: 0, angle: -25, textAnchor: "end", height: 50 }), _jsx(YAxis, { tick: { fill: MUTED, fontSize: 11 }, axisLine: false, tickLine: false, tickFormatter: (v) => `${(v / 1000).toFixed(0)}k` }), _jsx(Tooltip, { formatter: (v) => [fmtTooltip(Number(v ?? 0)), 'مبيعات'], contentStyle: { borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 } }), _jsx(Bar, { dataKey: "sales", fill: FILL, radius: [4, 4, 0, 0], maxBarSize: 32 })] }) }) }));
}
