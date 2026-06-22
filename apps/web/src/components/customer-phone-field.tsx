import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiSearchCustomers } from '../lib/api.js';
import { useAuth } from '../lib/auth-context.js';
import { formatCustomerPhoneDisplay, normalizeCustomerPhone } from '../lib/customer-phone.js';

export type CustomerSearchHit = {
  id: string;
  phone: string;
  name: string | null;
  address: string | null;
  isRegular: boolean;
  orderCount: number;
  lastOrderAt: string | null;
};

type CustomerPhoneFieldProps = {
  branchId: string;
  value: string;
  onChange: (phone: string) => void;
  onSelectCustomer?: (customer: CustomerSearchHit) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
};

export function CustomerPhoneField({
  branchId,
  value,
  onChange,
  onSelectCustomer,
  required,
  label = 'رقم التلفون',
  placeholder = '01xxxxxxxxx',
  size = 'small',
  disabled,
  error,
  helperText,
}: CustomerPhoneFieldProps) {
  const { accessToken } = useAuth();
  const [options, setOptions] = useState<CustomerSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!branchId || !accessToken) {
      setOptions([]);
      return;
    }
    const q = inputValue.trim();
    if (q.length < 3) {
      setOptions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void apiSearchCustomers(branchId, q, accessToken ?? undefined)
        .then((res: Awaited<ReturnType<typeof apiSearchCustomers>>) => {
          if (res.ok && res.data) setOptions(res.data);
          else setOptions([]);
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [branchId, accessToken, inputValue]);

  const selected = useMemo(
    () => options.find((o) => normalizeCustomerPhone(o.phone) === normalizeCustomerPhone(value)) ?? null,
    [options, value],
  );

  return (
    <Autocomplete<CustomerSearchHit, false, false, true>
      freeSolo
      disableClearable={false}
      options={options}
      loading={loading}
      disabled={disabled ?? false}
      filterOptions={(x) => x}
      inputValue={inputValue}
      onInputChange={(_e, next, reason) => {
        setInputValue(next);
        if (reason === 'input') onChange(next);
      }}
      value={selected}
      onChange={(_e, option) => {
        if (!option || typeof option === 'string') return;
        const phone = formatCustomerPhoneDisplay(option.phone);
        setInputValue(phone);
        onChange(phone);
        onSelectCustomer?.(option);
      }}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : formatCustomerPhoneDisplay(option.phone)
      }
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Box sx={{ width: '100%' }}>
            <StackRow option={option} />
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          id={params.id}
          disabled={params.disabled}
          size={size}
          fullWidth
          required={required ?? false}
          label={label}
          placeholder={placeholder}
          error={error ?? false}
          helperText={helperText}
          inputProps={{ ...params.inputProps, dir: 'ltr', style: { textAlign: 'left' } }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

function StackRow({ option }: { option: CustomerSearchHit }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <Typography variant="body2" fontWeight={700} dir="ltr">
          {formatCustomerPhoneDisplay(option.phone)}
        </Typography>
        {option.name ? (
          <Typography variant="body2" color="text.secondary">
            {option.name}
          </Typography>
        ) : null}
        {option.isRegular ? (
          <Chip label="عميل دائم" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
        ) : null}
      </Box>
      {option.address ? (
        <Typography variant="caption" color="text.secondary" noWrap>
          {option.address}
        </Typography>
      ) : null}
      {option.orderCount > 0 ? (
        <Typography variant="caption" color="text.secondary">
          {option.orderCount} طلب سابق
        </Typography>
      ) : null}
    </Box>
  );
}
