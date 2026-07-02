/**
 * P1 benchmark — compare multi-request POS open vs GET /shifts/pos-session
 */
const BASE = process.env.API_URL || 'http://localhost:4000/api';

const CREDENTIALS = [
  { username: 'cashier', password: '741523' },
  { username: 'cashier', password: 'password' },
];

async function timedFetch(label, path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const start = performance.now();
  const res = await fetch(url, opts);
  const text = await res.text();
  const ms = Math.round((performance.now() - start) * 100) / 100;
  const bytes = new TextEncoder().encode(text).length;
  let body = null;
  try { body = JSON.parse(text); } catch { body = null; }
  return { label, path, status: res.status, ms, bytes, body };
}

async function login() {
  for (const cred of CREDENTIALS) {
    const r = await timedFetch('login', '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cred),
    });
    if (r.status === 200 || r.status === 201) {
      const token = r.body?.accessToken;
      if (token) return { token, user: r.body?.user };
    }
  }
  return null;
}

async function measureLegacyOpen(h) {
  const posContext = await timedFetch('pos-context', '/shifts/pos-context', { headers: h });
  const branchId = posContext.body?.branch?.id;
  const cashBoxId = posContext.body?.cashBox?.id;
  const shiftId = posContext.body?.shift?.id;
  const orgId = null;

  const parallel = [];
  if (branchId) {
    parallel.push(
      timedFetch('cash-boxes', `/cash-boxes?branchId=${branchId}`, { headers: h }),
      timedFetch('pos-catalog', `/shifts/pos-catalog?branchId=${branchId}`, { headers: h }),
      timedFetch('orders-suspended', `/orders/suspended?branchId=${branchId}`, { headers: h }),
      timedFetch('receipt-settings', `/branches/${branchId}/receipt-settings`, { headers: h }),
    );
    if (cashBoxId) {
      parallel.push(timedFetch('shift-current', `/shifts/current?branchId=${branchId}&cashBoxId=${cashBoxId}`, { headers: h }));
    }
    if (shiftId) {
      parallel.push(
        timedFetch('orders-uncollected', `/orders/by-shift?shiftId=${shiftId}&filter=uncollected&take=25`, { headers: h }),
        timedFetch('orders-collected', `/orders/by-shift?shiftId=${shiftId}&filter=collected&take=10`, { headers: h }),
      );
    }
  }

  const t0 = performance.now();
  const results = await Promise.all(parallel);
  const parallelWall = Math.round((performance.now() - t0) * 100) / 100;

  return {
    requests: 1 + results.length,
    wallMs: Math.round((posContext.ms + parallelWall) * 100) / 100,
    totalBytes: posContext.bytes + results.reduce((s, r) => s + r.bytes, 0),
    endpoints: [posContext, ...results],
    shiftOpen: posContext.body?.shiftOpen,
    branchId,
    shiftId,
    orgId,
  };
}

async function measureSessionOpen(h) {
  const session = await timedFetch('pos-session', '/shifts/pos-session', { headers: h });
  return {
    requests: 1,
    wallMs: session.ms,
    totalBytes: session.bytes,
    endpoints: [session],
    shiftOpen: session.body?.shiftOpen,
    branchId: session.body?.branch?.id,
    shiftId: session.body?.shift?.id,
  };
}

async function medianSession(h, n = 3) {
  const times = [];
  let bytes = 0;
  for (let i = 0; i < n; i++) {
    const r = await timedFetch(`pos-session-w${i}`, '/shifts/pos-session', { headers: h });
    times.push(r.ms);
    bytes = r.bytes;
  }
  times.sort((a, b) => a - b);
  return { medianMs: times[1], bytes };
}

async function main() {
  const session = await login();
  if (!session) {
    console.error(JSON.stringify({ error: 'login_failed' }));
    process.exit(1);
  }

  const h = { Authorization: `Bearer ${session.token}` };
  const legacy = await measureLegacyOpen(h);
  const p1 = await measureSessionOpen(h);
  const warm = await medianSession(h);

  const report = {
    timestamp: new Date().toISOString(),
    user: session.user?.username,
    before_p0_p1_multi_request: {
      requestCount: legacy.requests,
      wallMs: legacy.wallMs,
      responseBytes: legacy.totalBytes,
      shiftOpen: legacy.shiftOpen,
    },
    after_pos_session: {
      requestCount: p1.requests,
      coldWallMs: p1.wallMs,
      warmMedianMs: warm.medianMs,
      responseBytes: p1.totalBytes,
      warmResponseBytes: warm.bytes,
      shiftOpen: p1.shiftOpen,
    },
    improvement: {
      requestsRemoved: legacy.requests - p1.requests,
      wallMsSavedCold: Math.round((legacy.wallMs - p1.wallMs) * 100) / 100,
      wallMsSavedWarm: Math.round((legacy.wallMs - warm.medianMs) * 100) / 100,
      bytesRatio: Math.round((p1.totalBytes / legacy.totalBytes) * 1000) / 1000,
    },
    legacyEndpoints: legacy.endpoints.map((e) => ({ label: e.label, ms: e.ms, bytes: e.bytes })),
    estimatedDbQueries_pos_session: legacy.shiftOpen
      ? '~18–24 (context + catalog + orders parallel)'
      : '~12–16 (no shift order pages)',
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
