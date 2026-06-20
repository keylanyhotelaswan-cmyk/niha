import fetch from 'node-fetch';

async function run(){
  const base = 'http://localhost:4000/api';
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'manager@niha.local', password: '123456789' }) });
  const loginBody = await login.json();
  console.log('login status', login.status, loginBody);
  if (!login.ok) return;
  const token = loginBody.accessToken;
  const create = await fetch(`${base}/users`, { method: 'POST', headers: {'Content-Type':'application/json', Authorization: `Bearer ${token}`}, body: JSON.stringify({ organizationId: loginBody.user.organizationId, fullName: 'Test Cashier', email: `testcashier+${Date.now()}@niha.local`, password: 'passwd123', roleCodes: ['cashier'] }) });
  const body = await create.text();
  console.log('create status', create.status, body);
}

run().catch(e=>{ console.error(e); process.exit(1); });
