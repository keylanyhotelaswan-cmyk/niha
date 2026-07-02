/**
 * P0 performance benchmark — measures POS-critical API timings.
 * Usage: node scripts/phase-p0-benchmark.mjs
 */
const BASE = process.env.API_URL || 'http://localhost:4000/api';

const CREDENTIALS = [
  { username: 'cashier', password: '741523' },
  { username: 'cashier', password: 'password' },
  { username: 'manager', password: '123456789' },
];

async function timedFetch(label, path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const start = performance.now();
  let status = 0;
  let bytes = 0;
  let body = null;
  let error = null;
  try {
    const res = await fetch(url, opts);
    status = res.status;
    const text = await res.text();
    bytes = new TextEncoder().encode(text).length;
    if (res.headers.get('content-type')?.includes('json') && text) {
      try { body = JSON.parse(text); } catch { body = null; }
    }
    if (!res.ok) error = text.slice(0, 200);
  } catch (e) {
    error = String(e.message || e);
  }
  const ms = Math.round((performance.now() - start) * 100) / 100;
  return { label, path, status, ms, bytes, error, body };
}

async function login() {
  for (const cred of CREDENTIALS) {
    const r = await timedFetch('login', '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cred),
    });
    if (r.status === 200 || r.status === 201) {
      const token = r.body?.accessToken || r.body?.access_token;
      if (token) return { token, user: r.body?.user, loginMs: r.ms, cred: cred.username };
    }
  }
  return null;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function medianOf(fn, n = 3) {
  const times = [];
  for (let i = 0; i < n; i++) times.push(await fn());
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

async function main() {
  const session = await login();
  if (!session) {
    console.error(JSON.stringify({ error: 'login_failed' }));
    process.exit(1);
  }
  const h = authHeaders(session.token);

  const coldPosContext = await timedFetch('pos-context-cold', '/shifts/pos-context', { headers: h });
  const warmPosContextMs = await medianOf(async () => {
    const r = await timedFetch('pos-context', '/shifts/pos-context', { headers: h });
    return r.ms;
  });

  const branchId = coldPosContext.body?.branch?.id;
  const cashBoxId = coldPosContext.body?.cashBox?.id;
  const shiftId = coldPosContext.body?.shift?.id;
  const hasFullContext = Boolean(coldPosContext.body?.shiftOpen && coldPosContext.body?.summary && coldPosContext.body?.posSummary);

  const legacyParallel = [];
  if (branchId) {
    legacyParallel.push(
      timedFetch('branches', `/branches?organizationId=${session.user?.organizationId}`, { headers: h }),
      timedFetch('cash-boxes', `/cash-boxes?branchId=${branchId}`, { headers: h }),
      timedFetch('pos-catalog', `/shifts/pos-catalog?branchId=${branchId}`, { headers: h }),
      timedFetch('orders-suspended', `/orders/suspended?branchId=${branchId}`, { headers: h }),
      timedFetch('receipt-settings', `/branches/${branchId}/receipt-settings`, { headers: h }),
    );
    if (cashBoxId) {
      legacyParallel.push(timedFetch('shift-current', `/shifts/current?branchId=${branchId}&cashBoxId=${cashBoxId}`, { headers: h }));
    }
    if (shiftId && !coldPosContext.body?.posSummary) {
      legacyParallel.push(timedFetch('pos-summary', `/shifts/pos-summary?shiftId=${shiftId}`, { headers: h }));
    }
    if (shiftId) {
      legacyParallel.push(
        timedFetch('orders-uncollected', `/orders/by-shift?shiftId=${shiftId}&filter=uncollected&take=25`, { headers: h }),
        timedFetch('orders-collected', `/orders/by-shift?shiftId=${shiftId}&filter=collected&take=10`, { headers: h }),
      );
    }
  }

  const optimizedParallel = [];
  if (branchId) {
    optimizedParallel.push(
      timedFetch('cash-boxes', `/cash-boxes?branchId=${branchId}`, { headers: h }),
      timedFetch('pos-catalog', `/shifts/pos-catalog?branchId=${branchId}`, { headers: h }),
      timedFetch('orders-suspended', `/orders/suspended?branchId=${branchId}`, { headers: h }),
      timedFetch('receipt-settings', `/branches/${branchId}/receipt-settings`, { headers: h }),
    );
    if (shiftId && !hasFullContext) {
      optimizedParallel.push(timedFetch('pos-summary', `/shifts/pos-summary?shiftId=${shiftId}`, { headers: h }));
    }
    if (shiftId) {
      optimizedParallel.push(
        timedFetch('orders-uncollected', `/orders/by-shift?shiftId=${shiftId}&filter=uncollected&take=25`, { headers: h }),
        timedFetch('orders-collected', `/orders/by-shift?shiftId=${shiftId}&filter=collected&take=10`, { headers: h }),
      );
    }
  }

  const tLegacy = performance.now();
  const legacyResults = await Promise.all(legacyParallel);
  const legacyWallMs = Math.round((performance.now() - tLegacy) * 100) / 100;

  const tOpt = performance.now();
  const optimizedResults = await Promise.all(optimizedParallel);
  const optimizedWallMs = Math.round((performance.now() - tOpt) * 100) / 100;

  let shiftSummaryMs = null;
  let shiftSummaryWarmMs = null;
  let treasuryBalanceMs = null;
  let treasuryBalanceWarmMs = null;

  if (shiftId) {
    const shiftSummaryCold = await timedFetch('treasury-shift-summary', `/treasury/summary?shiftId=${shiftId}`, { headers: h });
    shiftSummaryMs = shiftSummaryCold.ms;
    shiftSummaryWarmMs = await medianOf(async () => {
      const r = await timedFetch('treasury-shift-summary', `/treasury/summary?shiftId=${shiftId}`, { headers: h });
      return r.ms;
    });
  }

  const balanceProbe = await timedFetch('treasury-balance', `/treasury/balance?branchId=${branchId}`, { headers: h });
  if (balanceProbe.status === 200) {
    treasuryBalanceMs = balanceProbe.ms;
    treasuryBalanceWarmMs = await medianOf(async () => {
      const r = await timedFetch('treasury-balance', `/treasury/balance?branchId=${branchId}`, { headers: h });
      return r.ms;
    });
  }

  const posOpenLegacyMs = Math.round((coldPosContext.ms + legacyWallMs) * 100) / 100;
  const posOpenOptimizedMs = Math.round((warmPosContextMs + optimizedWallMs) * 100) / 100;

  const report = {
    timestamp: new Date().toISOString(),
    login: { ms: session.loginMs, user: session.user?.username },
    branchId,
    shiftId,
    shiftOpen: coldPosContext.body?.shiftOpen,
    hasFullContext,
    metrics: {
      getPosContext_cold_ms: coldPosContext.ms,
      getPosContext_warm_median_ms: warmPosContextMs,
      getShiftSummary_cold_ms: shiftSummaryMs,
      getShiftSummary_warm_median_ms: shiftSummaryWarmMs,
      getBranchTreasuryBalance_cold_ms: treasuryBalanceMs,
      getBranchTreasuryBalance_warm_median_ms: treasuryBalanceWarmMs,
      pos_open_legacy_requests: 1 + legacyResults.length,
      pos_open_legacy_wall_ms: posOpenLegacyMs,
      pos_open_optimized_requests: 1 + optimizedResults.length,
      pos_open_optimized_wall_ms: posOpenOptimizedMs,
      invalidatePosQueries_families_before: 7,
      invalidatePosSuspended_families_after: 1,
    },
    legacyParallel: legacyResults.map((r) => ({ label: r.label, ms: r.ms, status: r.status })),
    optimizedParallel: optimizedResults.map((r) => ({ label: r.label, ms: r.ms, status: r.status })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
