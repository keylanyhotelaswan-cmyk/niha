import fetch from 'node-fetch';

async function run(){
  const base = 'http://localhost:4000/api';
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'manager@niha.local', password: '123456789' }) });
  const loginBody = await login.json();
  console.log('login status', login.status);
  if (!login.ok) return console.error('login failed', loginBody);
  const token = loginBody.accessToken;
  const roles = await fetch(`${base}/roles`, { headers: { Authorization: `Bearer ${token}` } });
  console.log('roles status', roles.status);
  const body = await roles.json().catch(() => null);
  console.log(JSON.stringify(body, null, 2));
}

run().catch(e=>{ console.error(e); process.exit(1); });
