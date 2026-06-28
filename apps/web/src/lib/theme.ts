import { createTheme } from '@mui/material';

import { ui, pillButtonSx } from './ui-tokens.js';



export const appTheme = createTheme({

  direction: 'rtl',

  palette: {

    mode: 'light',

    primary: {

      main: ui.primary,

      light: ui.primarySoft,

      dark: ui.primaryDark,

      contrastText: '#FFFFFF',

    },

    secondary: {

      main: ui.btnNeutral,

      light: ui.surfaceHover,

      dark: ui.btnNeutralHover,

      contrastText: ui.btnNeutralText,

    },

    text: {

      primary: ui.ink,

      secondary: ui.muted,

    },

    background: {

      default: ui.bg,

      paper: ui.paper,

    },

    divider: ui.border,

    success: { main: ui.successSolid, light: ui.successBg, dark: ui.successSolidHover, contrastText: '#FFFFFF' },

    warning: { main: ui.warnSolid, light: ui.warnBg, dark: ui.warnSolidHover, contrastText: '#FFFFFF' },

    error: { main: ui.dangerSolid, light: ui.dangerBg, dark: ui.dangerSolidHover, contrastText: '#FFFFFF' },

    info: { main: ui.infoSolid, light: ui.infoBg, dark: ui.infoSolidHover, contrastText: '#FFFFFF' },

  },

  typography: {

    fontFamily: '"Cairo", "Segoe UI", system-ui, sans-serif',

    h4: { fontWeight: 700, letterSpacing: '-0.025em', color: ui.ink },

    h5: { fontWeight: 700, letterSpacing: '-0.02em', color: ui.ink },

    h6: { fontWeight: 600, letterSpacing: '-0.01em', color: ui.ink },

    subtitle1: { fontWeight: 600, color: ui.inkSoft },

    subtitle2: { fontWeight: 600, color: ui.muted, fontSize: '0.8125rem' },

    body2: { lineHeight: 1.65, color: ui.muted },

    overline: { letterSpacing: '0.14em', fontWeight: 600, color: ui.muted },

    button: { fontWeight: 600 },

  },

  shape: { borderRadius: ui.radiusSm },

  shadows: [

    'none',

    ui.shadowSm,

    ui.shadowSm,

    ui.shadow,

    ui.shadow,

    ui.shadow,

    ui.shadow,

    ui.shadow,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

    ui.shadowLg,

  ],

  components: {

    MuiCssBaseline: {

      styleOverrides: {

        body: {

          backgroundColor: ui.bg,

          WebkitFontSmoothing: 'antialiased',

        },

      },

    },

    MuiPaper: {

      defaultProps: { elevation: 0 },

      styleOverrides: {

        root: {

          backgroundImage: 'none',

          backgroundColor: ui.paper,

          borderRadius: ui.radius,

          border: `1px solid ${ui.border}`,

          boxShadow: ui.shadowSm,

        },

      },

    },

    MuiButton: {

      defaultProps: { disableElevation: true, variant: 'contained' },

      styleOverrides: {

        root: {

          textTransform: 'none',

          boxShadow: 'none',

          fontWeight: 600,

          border: 'none',

          '&:hover': { boxShadow: 'none' },

        },

        contained: {

          ...pillButtonSx,

        },

        containedPrimary: {

          backgroundColor: ui.primary,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.primaryDark },

        },

        containedSecondary: {

          backgroundColor: ui.btnNeutral,

          color: ui.btnNeutralText,

          '&:hover': { backgroundColor: ui.btnNeutralHover },

        },

        containedSuccess: {

          backgroundColor: ui.successSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.successSolidHover },

        },

        containedError: {

          backgroundColor: ui.dangerSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.dangerSolidHover },

        },

        containedWarning: {

          backgroundColor: ui.warnSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.warnSolidHover },

        },

        containedInfo: {

          backgroundColor: ui.infoSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.infoSolidHover },

        },

        outlined: {

          ...pillButtonSx,

          border: 'none',

          backgroundColor: ui.btnNeutral,

          color: ui.btnNeutralText,

          '&:hover': {

            backgroundColor: ui.btnNeutralHover,

            border: 'none',

          },

        },

        outlinedPrimary: {

          border: 'none',

          backgroundColor: ui.primary,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.primaryDark, border: 'none' },

        },

        outlinedSecondary: {

          border: 'none',

          backgroundColor: ui.btnNeutral,

          color: ui.btnNeutralText,

          '&:hover': { backgroundColor: ui.btnNeutralHover, border: 'none' },

        },

        outlinedSuccess: {

          border: 'none',

          backgroundColor: ui.successSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.successSolidHover, border: 'none' },

        },

        outlinedError: {

          border: 'none',

          backgroundColor: ui.dangerSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.dangerSolidHover, border: 'none' },

        },

        outlinedWarning: {

          border: 'none',

          backgroundColor: ui.warnSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.warnSolidHover, border: 'none' },

        },

        outlinedInfo: {

          border: 'none',

          backgroundColor: ui.infoSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.infoSolidHover, border: 'none' },

        },

        text: {

          ...pillButtonSx,

          backgroundColor: ui.btnNeutral,

          color: ui.btnNeutralText,

          '&:hover': { backgroundColor: ui.btnNeutralHover },

        },

        textPrimary: {

          backgroundColor: ui.primary,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.primaryDark },

        },

        textError: {

          backgroundColor: ui.dangerSolid,

          color: '#FFFFFF',

          '&:hover': { backgroundColor: ui.dangerSolidHover },

        },

        sizeSmall: {

          borderRadius: ui.radiusPill,

          px: 1.75,

          py: 0.5,

        },

      },

    },

    MuiChip: {

      defaultProps: { variant: 'filled' },

      styleOverrides: {

        root: {

          borderRadius: 8,

          fontWeight: 600,

          fontSize: '0.75rem',

          border: 'none',

        },

        filled: {

          border: 'none',

        },

        outlined: {

          border: 'none',

        },

        colorSuccess: {

          backgroundColor: ui.successBg,

          color: ui.success,

          borderColor: ui.successBorder,

        },

        colorWarning: {

          backgroundColor: ui.warnBg,

          color: ui.warn,

          borderColor: ui.warnBorder,

        },

        colorError: {

          backgroundColor: ui.dangerBg,

          color: ui.danger,

          borderColor: ui.dangerBorder,

        },

        colorInfo: {

          backgroundColor: ui.infoBg,

          color: ui.info,

          borderColor: ui.infoBorder,

        },

        colorPrimary: {

          backgroundColor: ui.primaryBg,

          color: ui.primaryDark,

          borderColor: 'rgba(108, 92, 231, 0.28)',

        },

      },

    },

    MuiTextField: {

      defaultProps: { size: 'small' },

      styleOverrides: {

        root: {

          '& .MuiOutlinedInput-root': {

            borderRadius: ui.radiusSm,

            backgroundColor: ui.paperElevated,

            '& fieldset': { borderColor: ui.border },

            '&:hover fieldset': { borderColor: ui.borderStrong },

            '&.Mui-focused fieldset': { borderColor: ui.primary, borderWidth: 1 },

          },

        },

      },

    },

    MuiTabs: {

      styleOverrides: {

        root: {

          backgroundColor: ui.surfaceMuted,

          borderRadius: ui.radiusPill,

          p: 0.5,

          minHeight: 44,

          border: 'none',

          boxShadow: ui.shadowSm,

        },

        indicator: { display: 'none' },

      },

    },

    MuiTab: {

      styleOverrides: {

        root: {

          textTransform: 'none',

          fontWeight: 600,

          minHeight: 38,

          borderRadius: ui.radiusPill,

          color: ui.muted,

          '&.Mui-selected': {

            color: '#FFFFFF',

            backgroundColor: ui.primary,

            boxShadow: ui.shadowSm,

          },

          '&.Mui-selected:hover': {

            backgroundColor: ui.primaryDark,

          },

          '&:hover': {

            backgroundColor: ui.surfaceHover,

          },

        },

      },

    },

    MuiTableCell: {

      styleOverrides: {

        head: {

          fontWeight: 600,

          color: ui.inkSoft,

          fontSize: '0.8125rem',

          borderBottomColor: ui.border,

          backgroundColor: ui.surfaceMuted,

        },

        body: {

          fontSize: '0.875rem',

          borderBottomColor: ui.border,

        },

      },

    },

    MuiAlert: {

      styleOverrides: {

        root: {

          borderRadius: ui.radiusSm,

          border: 'none',

        },

        standardInfo: {

          backgroundColor: ui.infoBg,

          color: ui.info,

        },

        standardSuccess: {

          backgroundColor: ui.successBg,

          color: ui.success,

        },

        standardError: {

          backgroundColor: ui.dangerBg,

          color: ui.danger,

        },

        standardWarning: {

          backgroundColor: ui.bannerBg,

          color: ui.warn,

        },

      },

    },

    MuiListItemButton: {

      styleOverrides: {

        root: {

          borderRadius: ui.radiusSm,

        },

      },

    },

    MuiCard: {

      defaultProps: { elevation: 0 },

      styleOverrides: {

        root: {

          backgroundImage: 'none',

          backgroundColor: ui.paper,

          borderRadius: ui.radius,

          border: `1px solid ${ui.border}`,

          boxShadow: ui.shadowSm,

        },

      },

    },

    MuiDialog: {

      styleOverrides: {

        paper: {

          borderRadius: ui.radius,

          boxShadow: ui.shadowLg,

        },

      },

    },

    MuiAvatar: {

      styleOverrides: {

        root: {

          backgroundColor: ui.primary,

        },

      },

    },

  },

});


