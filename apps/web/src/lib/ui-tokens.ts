/**

 * ثيم Buffet — خلفية بيضاء + بنفسجي Indigo + أزرار معبّأة متناسقة.

 */

export const ui = {

  // خلفيات

  bg: '#FFFFFF',

  ivory: '#FFFFFF',

  paper: '#FFFFFF',

  paperElevated: '#FFFFFF',

  surfaceMuted: '#F4F6F8',

  surfaceHover: '#EEF1F4',



  // Primary — Indigo / بنفسجي

  primary: '#6C5CE7',

  primaryDark: '#5B4BD6',

  primarySoft: '#8B7CF0',

  primaryBg: 'rgba(108, 92, 231, 0.12)',



  // Sidebar

  sidebarActive: '#1E2433',

  sidebarActiveText: '#FFFFFF',

  sidebarHover: 'rgba(107, 114, 128, 0.08)',



  // Legacy aliases (used across pages)

  navy: '#6C5CE7',

  navyDark: '#5B4BD6',

  navySoft: '#8B7CF0',

  sky: '#FFFFFF',

  skyLight: '#F4F6F8',

  skyBorder: 'rgba(108, 92, 231, 0.12)',



  // نصوص

  ink: '#1A1D26',

  inkSoft: '#374151',

  muted: '#6B7280',



  // حالات — نص + pastel للـ chips/alerts

  success: '#276749',

  successBg: 'rgba(72, 187, 120, 0.14)',

  successBorder: 'rgba(72, 187, 120, 0.28)',

  successSolid: '#38A169',

  successSolidHover: '#2F855A',

  warn: '#9C4221',

  warnBg: 'rgba(251, 176, 59, 0.16)',

  warnBorder: 'rgba(251, 176, 59, 0.32)',

  warnSolid: '#ED8936',

  warnSolidHover: '#DD6B20',

  info: '#2B6CB0',

  infoBg: 'rgba(99, 179, 237, 0.14)',

  infoBorder: 'rgba(99, 179, 237, 0.28)',

  infoSolid: '#4299E1',

  infoSolidHover: '#3182CE',

  danger: '#C53030',

  dangerBg: 'rgba(229, 62, 62, 0.10)',

  dangerBorder: 'rgba(229, 62, 62, 0.22)',

  dangerSolid: '#E53E3E',

  dangerSolidHover: '#C53030',

  bannerBg: 'rgba(255, 244, 191, 0.65)',



  secondary: '#6B7280',

  secondaryBg: 'rgba(107, 114, 128, 0.08)',

  secondaryBorder: 'rgba(107, 114, 128, 0.20)',

  btnNeutral: '#F1F3F5',

  btnNeutralHover: '#E5E7EB',

  btnNeutralText: '#374151',



  border: 'rgba(30, 36, 51, 0.08)',

  borderStrong: 'rgba(30, 36, 51, 0.12)',

  shadowSm: '0 2px 10px rgba(30, 36, 51, 0.06)',

  shadow: '0 4px 20px rgba(30, 36, 51, 0.08)',

  shadowLg: '0 8px 32px rgba(30, 36, 51, 0.10)',

  radius: 14,

  radiusSm: 12,

  radiusPill: 9999,

} as const;



export type MetricTone = 'default' | 'success' | 'warning' | 'info' | 'primary';



export function metricToneSx(tone: MetricTone = 'default') {

  const map: Record<MetricTone, { bgcolor: string; color: string; border?: string }> = {

    default: { bgcolor: ui.surfaceMuted, color: ui.ink },

    success: { bgcolor: ui.successBg, color: ui.success },

    warning: { bgcolor: ui.warnBg, color: ui.warn },

    info: { bgcolor: ui.infoBg, color: ui.info },

    primary: { bgcolor: ui.primaryBg, color: ui.primaryDark },

  };

  const t = map[tone];

  return {

    bgcolor: t.bgcolor,

    color: t.color,

    ...(t.border ? { border: `1px solid ${t.border}` } : {}),

  };

}



export const cardSx = {

  borderRadius: `${ui.radius}px`,

  border: `1px solid ${ui.border}`,

  bgcolor: ui.paper,

  boxShadow: ui.shadowSm,

} as const;



export const sidebarSx = {

  borderRadius: `${ui.radius}px`,

  border: `1px solid ${ui.border}`,

  bgcolor: ui.paper,

  boxShadow: ui.shadowSm,

} as const;



export const sectionSx = {

  borderRadius: `${ui.radius}px`,

  border: `1px solid ${ui.border}`,

  bgcolor: ui.paper,

  boxShadow: ui.shadowSm,

} as const;



export const pillButtonSx = {

  borderRadius: `${ui.radiusPill}px`,

  px: 2.5,

  py: 0.875,

} as const;



export const tabsSx = {

  backgroundColor: ui.surfaceMuted,

  borderRadius: `${ui.radiusPill}px`,

  p: 0.5,

  boxShadow: ui.shadowSm,

  minHeight: 44,

  '& .MuiTab-root.Mui-selected': {

    backgroundColor: ui.primary,

    color: '#FFFFFF',

  },

  '& .MuiTab-root.Mui-selected:hover': {

    backgroundColor: ui.primaryDark,

  },

} as const;



export const statusColors = {

  ok: ui.success,

  warn: ui.warn,

  danger: ui.danger,

} as const;


