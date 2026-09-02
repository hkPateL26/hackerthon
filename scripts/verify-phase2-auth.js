/**
 * Phase 2 Security & Authentication Live Verification Script
 */
const http = require('http');

function makeRequest(options, postData, cookies) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json || data,
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('==================================================');
  console.log('PHASE 2 AUTHENTICATION & RBAC LIVE VERIFICATION');
  console.log('==================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, title, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title} ${details ? '— ' + details : ''}`);
    } else {
      console.error(`[FAIL] ${title} — ${details}`);
    }
  }

  // 1. Admin Login
  console.log('--- 1. Admin Login ---');
  const adminLogin = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST' },
    JSON.stringify({ email: 'admin@police.gujarat.gov.in', password: 'Admin@1234' }),
  );
  assert(adminLogin.statusCode === 200, 'Admin login status code is 200', `Got ${adminLogin.statusCode}`);
  assert(!!adminLogin.data?.accessToken, 'JWT accessToken received in body');
  assert(adminLogin.data?.user?.email === 'admin@police.gujarat.gov.in', 'User email verified');
  assert(adminLogin.data?.user?.role === 'ADMIN', 'User role is ADMIN');
  assert(!adminLogin.data?.user?.passwordHash && !adminLogin.data?.user?.password, 'Password hash is strictly NOT exposed');

  const setCookie = adminLogin.headers['set-cookie'];
  const hasHttpOnlyCookie = setCookie && setCookie.some((c) => c.includes('refreshToken') && c.includes('HttpOnly'));
  assert(hasHttpOnlyCookie, 'HttpOnly refreshToken cookie set in response headers');

  const adminToken = adminLogin.data?.accessToken;
  const adminCookie = setCookie ? setCookie[0].split(';')[0] : '';

  // 2. Wrong Password
  console.log('\n--- 2. Wrong Password ---');
  const badLogin = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST' },
    JSON.stringify({ email: 'admin@police.gujarat.gov.in', password: 'WrongPassword!' }),
  );
  assert(badLogin.statusCode === 401, 'Wrong password returns 401 Unauthorized', `Got ${badLogin.statusCode}`);
  assert(badLogin.data?.message === 'Invalid email address or password', 'Generic error message returned');

  // 3. Supervisor Login
  console.log('\n--- 3. Supervisor Login ---');
  const supLogin = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST' },
    JSON.stringify({ email: 'supervisor@police.gujarat.gov.in', password: 'Supervisor@1234' }),
  );
  assert(supLogin.statusCode === 200, 'Supervisor login returns 200');
  assert(supLogin.data?.user?.role === 'SUPERVISOR', 'Supervisor role is SUPERVISOR');

  // 4. Operator Login
  console.log('\n--- 4. Operator Login ---');
  const opLogin = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST' },
    JSON.stringify({ email: 'operator@police.gujarat.gov.in', password: 'Operator@1234' }),
  );
  assert(opLogin.statusCode === 200, 'Operator login returns 200');
  assert(opLogin.data?.user?.role === 'OPERATOR', 'Operator role is OPERATOR');
  const opToken = opLogin.data?.accessToken;

  // 5. GET /api/auth/me (Authenticated)
  console.log('\n--- 5. Profile /api/auth/me (Authenticated) ---');
  const meAuth = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  assert(meAuth.statusCode === 200, 'Profile returns 200 with Bearer token');
  assert(meAuth.data?.email === 'admin@police.gujarat.gov.in', 'Profile matches authenticated user');

  // 6. GET /api/auth/me (Unauthenticated -> 401)
  console.log('\n--- 6. Profile /api/auth/me (Unauthenticated) ---');
  const meUnauth = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/me', method: 'GET' },
  );
  assert(meUnauth.statusCode === 401, 'Unauthenticated profile request returns 401');

  // 7. Dev Test Admin endpoint with ADMIN token -> 200
  console.log('\n--- 7. RBAC ADMIN Authorization ---');
  const adminTest = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/dev/test-admin',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  assert(adminTest.statusCode === 200, 'ADMIN role allowed on admin-only route (200 OK)');

  // 8. Dev Test Admin endpoint with OPERATOR token -> 403 Forbidden
  console.log('\n--- 8. RBAC Role Rejection (403 Forbidden) ---');
  const opAdminTest = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/dev/test-admin',
      method: 'GET',
      headers: { Authorization: `Bearer ${opToken}` },
    },
  );
  assert(opAdminTest.statusCode === 403, 'OPERATOR role denied on admin route with 403 Forbidden', `Got ${opAdminTest.statusCode}`);

  // 9. Refresh Token Rotation
  console.log('\n--- 9. Refresh Token Rotation (Cookie) ---');
  const refreshResp = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/refresh', method: 'POST' },
    null,
    adminCookie,
  );
  assert(refreshResp.statusCode === 200, 'Token refresh returns 200 OK via HttpOnly cookie');
  assert(!!refreshResp.data?.accessToken, 'New rotated access token received');
  const newSetCookie = refreshResp.headers['set-cookie'];
  const newAdminCookie = newSetCookie ? newSetCookie[0].split(';')[0] : '';
  assert(newAdminCookie !== adminCookie, 'Refresh token rotated with new cookie value');

  // 10. Logout
  console.log('\n--- 10. Logout & Session Invalidation ---');
  const logoutResp = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/logout',
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshResp.data?.accessToken}` },
    },
    null,
    newAdminCookie,
  );
  assert(logoutResp.statusCode === 200, 'Logout returns 200 OK');
  const clearCookieHeader = logoutResp.headers['set-cookie'];
  const cookieCleared = clearCookieHeader && clearCookieHeader.some((c) => c.includes('refreshToken=;') || c.includes('Max-Age=0'));
  assert(cookieCleared, 'Refresh cookie cleared on logout (Max-Age=0 / empty)');

  // 11. Replay / Reuse Blocked
  console.log('\n--- 11. Replay / Revocation Check ---');
  const replayResp = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/refresh', method: 'POST' },
    null,
    newAdminCookie,
  );
  assert(replayResp.statusCode === 401, 'Logged out / rotated refresh token rejected with 401', `Got ${replayResp.statusCode}`);

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} / ${total} CHECKS PASSED`);
  console.log('==================================================');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
