import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState, type FocusEvent } from 'react';
import { apiSearchDeliveryCaptains } from '../lib/api.js';
import { useAuth } from '../lib/auth-context.js';
import type { DeliveryDriver } from '../lib/pos-receipt-settings.js';

export type DeliveryCaptainOption = {
  name: string;
  phone?: string | null;
  orderCount?: number;
  source: 'settings' | 'history';
};

type CaptainNameFieldProps = {
  branchId: string;
  value: string;
  onChange: (name: string) => void;
  deliveryDrivers?: DeliveryDriver[];
  label?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  required?: boolean;
};

function commitCaptainName(raw: string, onChange: (name: string) => void) {
  onChange(raw.trim());
}

export function CaptainNameField({
  branchId,
  value,
  onChange,
  deliveryDrivers = [],
  label = 'الكابتن (دليفري)',
  placeholder = 'اسم السائق — يُقترح من الطلبات السابقة',
  size = 'small',
  disabled,
  required,
}: CaptainNameFieldProps) {
  const { accessToken } = useAuth();
  const [historyHits, setHistoryHits] = useState<Array<{ name: string; orderCount: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!branchId || !accessToken) {
      setHistoryHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void apiSearchDeliveryCaptains(branchId, inputValue.trim(), accessToken ?? undefined)
        .then((res) => {
          if (res.ok && res.data) setHistoryHits(res.data);
          else setHistoryHits([]);
        })
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [branchId, accessToken, inputValue]);

  const options = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    const seen = new Set<string>();
    const merged: DeliveryCaptainOption[] = [];

    for (const driver of deliveryDrivers) {
      const name = driver.name.trim();
      if (!name) continue;
      if (q && !name.toLowerCase().includes(q)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ name, phone: driver.phone ?? null, source: 'settings' });
    }

    for (const hit of historyHits) {
      const name = hit.name.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ name, orderCount: hit.orderCount, source: 'history' });
    }

    return merged;
  }, [deliveryDrivers, historyHits, inputValue]);

  const selected = useMemo(
    () => options.find((o) => o.name === value.trim()) ?? (value.trim() ? { name: value.trim(), source: 'history' as const } : null),
    [options, value],
  );

  return (
    <Autocomplete<DeliveryCaptainOption, false, false, true>
      freeSolo
      options={options}
      loading={loading}
      disabled={disabled ?? false}
      filterOptions={(x) => x}
      inputValue={inputValue}
      onInputChange={(_e, next, reason) => {
        setInputValue(next);
        if (reason === 'input') {
          onChange(next);
        } else if (reason === 'clear') {
          onChange('');
        }
      }}
      value={selected}
      onChange={(_e, option) => {
        if (typeof option === 'string') {
          setInputValue(option);
          commitCaptainName(option, onChange);
          return;
        }
        if (option) {
          setInputValue(option.name);
          commitCaptainName(option.name, onChange);
          return;
        }
        setInputValue('');
        onChange('');
      }}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
      isOptionEqualToValue={(a, b) => a.name === b.name}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={`${option.source}-${option.name}`}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.25 }}>
            <Typography variant="body2" fontWeight={700}>
              {option.name}
              {option.phone ? (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.75 }}>
                  · {option.phone}
                </Typography>
              ) : null}
            </Typography>
            {option.orderCount != null && option.orderCount > 0 ? (
              <Typography variant="caption" color="text.secondary">
                {option.orderCount} طلب سابق
              </Typography>
            ) : option.source === 'settings' ? (
              <Typography variant="caption" color="text.secondary">
                من قائمة الإعدادات
              </Typography>
            ) : null}
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
          inputProps={params.inputProps}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          onBlur={(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const nativeOnBlur = params.inputProps.onBlur;
            if (nativeOnBlur) nativeOnBlur(event as FocusEvent<HTMLInputElement>);
            const trimmed = inputValue.trim();
            if (trimmed !== value.trim()) {
              setInputValue(trimmed);
              onChange(trimmed);
            }
          }}
        />
      )}
    />
  );
}
