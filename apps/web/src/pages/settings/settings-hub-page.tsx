import {
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.js';
import { getReceiptSettings } from '../../lib/pos-receipt-settings.js';
import { localTodayKey } from '../../lib/date-utils.js';

type SettingsCard = {
  title: string;
  description: string;
  path: string;
  permission?: string;
  meta?: string;
};

export function SettingsHubPage() {
  const { permissions } = useAuth();
  const granted = permissions?.map((p: { code: string }) => p.code) ?? [];
  const receipt = getReceiptSettings();

  const cards: SettingsCard[] = [
    {
      title: 'الخزنة والورديات',
      description: 'الوردية الحالية، اعتماد التحصيل، الخزنة، وسجل ورديات اليوم.',
      path: `/shifts?from=${localTodayKey()}&to=${localTodayKey()}`,
      permission: 'treasury.manage',
      meta: `اليوم · ${localTodayKey()}`,
    },
    {
      title: 'الفاتورة والطباعة',
      description: 'شكل الفاتورة، الهوامش، الخط، الإطار، الطابعة، ونسخ الطباعة (شيف / زبون).',
      path: '/settings/receipt',
      permission: 'treasury.manage',
      meta: `${receipt.paperWidthMm}mm · بالطول · هامش ${receipt.marginMm}mm · ${receipt.paperSize}`,
    },
    {
      title: 'المستخدمين والصلاحيات',
      description: 'إضافة مستخدمين، الأدوار، وحذف الحسابات.',
      path: '/settings/users',
      permission: 'users.manage',
    },
  ];

  const visible = cards.filter((c) => !c.permission || granted.includes(c.permission));

  return (
    <Stack spacing={2}>
      <Typography variant="body1" color="text.secondary">
        اختر القسم اللي عايز تعدّله:
      </Typography>
      <Grid container spacing={2}>
        {visible.map((card) => (
          <Grid item xs={12} md={6} key={card.path}>
            <Paper
              sx={{
                p: 2.5,
                height: '100%',
                borderRadius: 3,
                border: '1px solid rgba(185, 56, 23, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography variant="h6" fontWeight={800}>
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {card.description}
              </Typography>
              {card.meta ? (
                <Typography variant="caption" color="text.secondary">
                  الحالي: {card.meta}
                </Typography>
              ) : null}
              <Box>
                <Button component={RouterLink} to={card.path} variant="contained">
                  فتح
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
