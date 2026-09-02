/**
 * Phase 5 — Final Acceptance Verification Script
 * Comprehensive automated verification covering:
 *  1. Actual Browser Video Playback via Headless Chrome (Puppeteer-Core)
 *  2. Inactive Camera Protection Lifecycle
 *  3. Full Phase 1–4 Regression Verification
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({ ...options, headers }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json !== null ? json : text,
          rawBuffer: buffer,
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(email, password) {
  const resp = await request(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST' },
    JSON.stringify({ email, password }),
  );
  return {
    token: resp.data?.accessToken,
    user: resp.data?.user,
    cookie: resp.headers['set-cookie'],
  };
}

async function main() {
  console.log('===============================================================');
  console.log('PHASE 5 — FINAL ACCEPTANCE & COMPLETE REGRESSION VERIFICATION');
  console.log('===============================================================\n');

  const results = {
    browser: {
      hlsInit: false,
      playlistLoaded: false,
      mediaLoaded: false,
      actualPlayback: false,
      progression: false,
      noFatalErrors: false,
      details: {},
    },
    inactiveCamera: {
      initialStream: false,
      deactivationSafe: false,
      processPrevented: false,
      appropriateStatus: false,
      reactivationRecovery: false,
    },
    regression: {
      phase1: false,
      phase2: false,
      phase3: false,
      phase4: false,
      details: {},
    },
  };

  // -------------------------------------------------------------
  // PART 0: AUTHENTICATION SETUP
  // -------------------------------------------------------------
  console.log('=== Step 0: Setup & Authentication ===');
  const adminAuth = await login('admin@police.gujarat.gov.in', 'Admin@1234');
  const opAuth = await login('operator@police.gujarat.gov.in', 'Operator@1234');
  const supAuth = await login('supervisor@police.gujarat.gov.in', 'Supervisor@1234');

  if (!adminAuth.token) {
    throw new Error('Failed to obtain Admin authentication token');
  }
  console.log('[OK] Admin, Operator, and Supervisor accounts authenticated.\n');

  // Fetch active camera for testing
  const camResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras?search=CAM-AHM-001',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const targetCam = camResp.data?.items?.[0];
  if (!targetCam) throw new Error('Target camera CAM-AHM-001 not found in database');
  const targetCamId = targetCam.id;
  console.log(`[OK] Target Camera: ${targetCam.name} (${targetCam.cameraCode}, ID: ${targetCamId})\n`);

  // -------------------------------------------------------------
  // PART 1: ACTUAL BROWSER VIDEO PLAYBACK (MANDATORY)
  // -------------------------------------------------------------
  console.log('===============================================================');
  console.log('1. ACTUAL BROWSER VIDEO PLAYBACK — MANDATORY');
  console.log('===============================================================');

  // 1.1 Start active stream session
  console.log('1.1. Starting stream session...');
  const startResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/stream/start`,
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  console.log(`     Start Response Status: ${startResp.statusCode}, Stream Status: ${startResp.data?.status}`);

  // 1.2 Confirm FFmpeg process is running in Windows process table
  let ffmpegRunning = false;
  try {
    const tasklist = execSync('tasklist /FI "IMAGENAME eq ffmpeg.exe" /FO CSV /NH', { encoding: 'utf8' });
    ffmpegRunning = tasklist.includes('ffmpeg.exe');
  } catch {}
  console.log(`1.2. FFmpeg Process Running in OS: ${ffmpegRunning ? 'YES' : 'NO'}`);

  // 1.3 & 1.4 Confirm index.m3u8 and HLS segments exist on D: drive
  console.log('1.3 & 1.4. Waiting for FFmpeg to produce HLS segments on D: drive...');
  await sleep(4000);

  const hlsDir = path.resolve(process.cwd(), 'runtime', 'hls', targetCamId);
  const playlistFile = path.join(hlsDir, 'index.m3u8');
  const playlistExists = fs.existsSync(playlistFile);
  const segmentFiles = fs.existsSync(hlsDir)
    ? fs.readdirSync(hlsDir).filter((f) => f.endsWith('.ts'))
    : [];

  console.log(`     Playlist exists: ${playlistExists ? 'YES' : 'NO'} (${playlistFile})`);
  console.log(`     Segment chunks generated: ${segmentFiles.length} (${segmentFiles.slice(0, 3).join(', ')})`);

  // 1.5 Open Real Headless Chrome Browser
  console.log('1.5. Launching real Chrome browser for UI playback test...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      '--disable-web-security',
      '--window-size=1280,720',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Track network requests for HLS files and API responses
  const hlsRequests = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/')) {
      console.log(`     [BROWSER NET] ${res.status()} ${url}`);
    }
    if (url.includes('/api/streams/hls/')) {
      hlsRequests.push({ url, status: res.status() });
    }
  });

  page.on('console', (msg) => {
    console.log(`     [BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log(`     [BROWSER ERROR] ${err.message}`);
  });

  try {
    // 1. Log in via UI
    console.log('     Navigating to http://localhost:5173/login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    await page.waitForSelector('#officer-email');
    await page.type('#officer-email', 'admin@police.gujarat.gov.in');
    await page.type('#officer-password', 'Admin@1234');
    await page.click('#login-submit-btn');

    // Wait for successful login transition
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log(`     Logged in successfully. Current URL: ${page.url()}`);

    // 2. Open Stream Page via Client Navigation
    console.log('     Navigating to /cameras via sidebar navigation...');
    await page.waitForSelector('a[href="/cameras"]', { timeout: 10000 });
    await page.click('a[href="/cameras"]');
    await sleep(2000);

    const currentUrl = page.url();
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.log(`     Current URL: ${currentUrl}`);
    console.log(`     Body snippet: ${bodySnippet.replace(/\n+/g, ' ')}`);

    // Wait for cameras table and click the Live stream button
    console.log('     Waiting for camera registry table...');
    await page.waitForSelector('button[title="Live Stream Feed"]', { timeout: 10000 });
    console.log('     Clicking Live Stream Feed button...');
    await page.click('button[title="Live Stream Feed"]');

    // Wait for route to become /cameras/:id/stream
    await page.waitForFunction(() => window.location.pathname.includes('/stream'), { timeout: 10000 });
    console.log(`     Successfully navigated to: ${page.url()}`);

    // Wait for video element (after camera data loads)
    console.log('     Waiting for <video> element to mount in DOM...');
    await page.waitForSelector('video', { timeout: 15000 });
    console.log('     Found <video> element on page.');

    // Wait 4 seconds for Hls.js to fetch manifest, segments, and buffer video
    await sleep(4000);

    // 3. Inspect video element and observe real playback
    const videoStats = await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (!v) return null;

      // Ensure video is playing
      if (v.paused) {
        try {
          await v.play();
        } catch {}
      }

      const t0 = v.currentTime;
      const readyState0 = v.readyState;
      const paused0 = v.paused;
      const w0 = v.videoWidth;
      const h0 = v.videoHeight;
      const err0 = v.error ? v.error.message : null;

      // Wait 3 seconds inside browser to observe progression
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const t1 = v.currentTime;
      const paused1 = v.paused;
      const readyState1 = v.readyState;

      return {
        t0,
        t1,
        diff: t1 - t0,
        readyState: readyState1,
        paused: paused1,
        videoWidth: w0,
        videoHeight: h0,
        error: err0,
      };
    });

    console.log('     Video Telemetry from Browser DOM:');
    console.log(`       - readyState: ${videoStats?.readyState} (HAVE_METADATA=1, HAVE_CURRENT_DATA=2, HAVE_FUTURE_DATA=3, HAVE_ENOUGH_DATA=4)`);
    console.log(`       - videoDimensions: ${videoStats?.videoWidth}x${videoStats?.videoHeight}px`);
    console.log(`       - initial currentTime: ${videoStats?.t0.toFixed(2)}s`);
    console.log(`       - 3.0s later currentTime: ${videoStats?.t1.toFixed(2)}s (Delta: ${videoStats?.diff.toFixed(2)}s)`);
    console.log(`       - isPaused: ${videoStats?.paused}`);
    console.log(`       - videoError: ${videoStats?.error || 'None'}`);

    // Check Network activity
    const playlistReq = hlsRequests.find((r) => r.url.endsWith('.m3u8') && r.status === 200);
    const segmentReq = hlsRequests.find((r) => r.url.endsWith('.ts') && r.status === 200);

    console.log(`     Browser Network Activity:`);
    console.log(`       - Playlist (.m3u8) HTTP 200: ${playlistReq ? 'YES' : 'NO'}`);
    console.log(`       - Media Segment (.ts) HTTP 200: ${segmentReq ? 'YES' : 'NO'}`);

    // Evaluate Criteria
    results.browser.hlsInit = playlistReq !== undefined;
    results.browser.playlistLoaded = playlistReq !== undefined;
    results.browser.mediaLoaded = segmentReq !== undefined && (videoStats?.readyState || 0) >= 2;
    results.browser.actualPlayback = videoStats !== null && !videoStats.paused;
    results.browser.progression = videoStats !== null && videoStats.diff > 1.0;
    results.browser.noFatalErrors = videoStats?.error === null;
    results.browser.details = videoStats;

    console.log(`\n--- Browser Playback Explicit Results ---`);
    console.log(`  - Hls.js initialization: ${results.browser.hlsInit ? 'PASS' : 'FAIL'}`);
    console.log(`  - Playlist loading:      ${results.browser.playlistLoaded ? 'PASS' : 'FAIL'}`);
    console.log(`  - Media loading:         ${results.browser.mediaLoaded ? 'PASS' : 'FAIL'}`);
    console.log(`  - Actual playback:       ${results.browser.actualPlayback ? 'PASS' : 'FAIL'}`);
    console.log(`  - Playback progression:  ${results.browser.progression ? 'PASS' : 'FAIL'}`);
    console.log(`  - No fatal errors:       ${results.browser.noFatalErrors ? 'PASS' : 'FAIL'}`);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------
  // PART 2: INACTIVE CAMERA PROTECTION (MANDATORY)
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('2. INACTIVE CAMERA PROTECTION — MANDATORY');
  console.log('===============================================================');

  // 2.1 Verify normal stream start works on active camera
  console.log('2.1. Verifying normal stream start works on active camera...');
  const normalStart = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/stream/start`,
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const normalStartOk = normalStart.statusCode === 200 && normalStart.data?.status === 'RUNNING';
  console.log(`     Normal Start: ${normalStartOk ? 'PASS' : 'FAIL'} (Status: ${normalStart.data?.status})`);
  results.inactiveCamera.initialStream = normalStartOk;

  // Clean stop
  await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/stream/stop`,
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });

  // 2.2 Deactivate the camera
  console.log('2.2. Deactivating camera via PATCH /api/cameras/:id/deactivate...');
  const deactResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/deactivate`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const isDeactivated = deactResp.statusCode === 200 && deactResp.data?.isActive === false;
  console.log(`     Camera Deactivated: ${isDeactivated ? 'YES (isActive=false)' : 'NO'}`);
  results.inactiveCamera.deactivationSafe = isDeactivated;

  // 2.3 Attempt POST /api/cameras/:id/stream/start on the deactivated camera
  console.log('2.3. Attempting POST /api/cameras/:id/stream/start on deactivated camera...');
  const inactiveStart = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/stream/start`,
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });

  const rejectedSafely =
    inactiveStart.statusCode === 400 &&
    JSON.stringify(inactiveStart.data).toLowerCase().includes('inactive');
  console.log(`     Rejection HTTP Status: ${inactiveStart.statusCode} (Expected: 400)`);
  console.log(`     Rejection Message: ${JSON.stringify(inactiveStart.data?.message || inactiveStart.data)}`);
  results.inactiveCamera.appropriateStatus = rejectedSafely;

  // Check that no FFmpeg process was created
  const streamCheck = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/stream`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const noProcess = !streamCheck.data?.processId || streamCheck.data?.status !== 'RUNNING';
  console.log(`     No FFmpeg process created: ${noProcess ? 'PASS' : 'FAIL'} (Status: ${streamCheck.data?.status})`);
  results.inactiveCamera.processPrevented = noProcess;

  // 2.4 Reactivate the camera
  console.log('2.4. Reactivating camera via PATCH /api/cameras/:id/activate...');
  const reactResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/activate`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const isReactivated = reactResp.statusCode === 200 && reactResp.data?.isActive === true;
  console.log(`     Camera Reactivated: ${isReactivated ? 'YES (isActive=true)' : 'NO'}`);

  // 2.5 Verify stream can start again
  console.log('2.5. Verifying stream can start again after reactivation...');
  const recoveredStart = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/stream/start`,
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const recoveryOk = recoveredStart.statusCode === 200 && recoveredStart.data?.status === 'RUNNING';
  console.log(`     Stream Started After Reactivation: ${recoveryOk ? 'PASS' : 'FAIL'}`);
  results.inactiveCamera.reactivationRecovery = recoveryOk;

  // Cleanup stream
  await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${targetCamId}/stream/stop`,
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });

  // -------------------------------------------------------------
  // PART 3: FULL PHASE 1–4 REGRESSION (MANDATORY)
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('3. FULL PHASE 1–4 REGRESSION — MANDATORY');
  console.log('===============================================================');

  // PHASE 1
  console.log('\n--- Phase 1 Regression ---');
  const backendHealth = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET',
  });
  const p1BackendOk = backendHealth.statusCode === 200 && backendHealth.data?.status === 'ok';
  console.log(`  1. GET /api/health -> 200: ${p1BackendOk ? 'PASS' : 'FAIL'}`);

  const aiHealth = await request({
    hostname: 'localhost',
    port: 8000,
    path: '/health',
    method: 'GET',
  });
  const p1AiOk = aiHealth.statusCode === 200;
  console.log(`  2. AI Engine /health -> 200: ${p1AiOk ? 'PASS' : 'FAIL'}`);

  let postgisOk = false;
  try {
    const pgOut = execSync(
      '"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe" -U postgres -d cctv_hackathon -t -A -c "SELECT PostGIS_Version();"',
      { encoding: 'utf8' },
    );
    postgisOk = pgOut.includes('3.');
  } catch {}
  console.log(`  3. PostgreSQL + PostGIS (SELECT PostGIS_Version()): ${postgisOk ? 'PASS' : 'FAIL'}`);

  let ffmpegOk = false;
  try {
    const ffOut = execSync('"D:\\DevTools\\ffmpeg\\bin\\ffmpeg.exe" -version', { encoding: 'utf8' });
    ffmpegOk = ffOut.includes('ffmpeg version');
  } catch {}
  console.log(`  4. FFmpeg available on D: drive: ${ffmpegOk ? 'PASS' : 'FAIL'}`);

  results.regression.phase1 = p1BackendOk && p1AiOk && postgisOk && ffmpegOk;

  // PHASE 2
  console.log('\n--- Phase 2 Regression ---');
  const p2LoginAdmin = adminAuth.token !== undefined;
  const p2LoginSup = supAuth.token !== undefined;
  const p2LoginOp = opAuth.token !== undefined;
  console.log(`  1. Admin Login: ${p2LoginAdmin ? 'PASS' : 'FAIL'}`);
  console.log(`  2. Supervisor Login: ${p2LoginSup ? 'PASS' : 'FAIL'}`);
  console.log(`  3. Operator Login: ${p2LoginOp ? 'PASS' : 'FAIL'}`);

  const meResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const p2MeOk = meResp.statusCode === 200 && meResp.data?.email === 'admin@police.gujarat.gov.in';
  console.log(`  4. /api/auth/me Profile: ${p2MeOk ? 'PASS' : 'FAIL'}`);

  let p2RefreshOk = false;
  if (adminAuth.cookie) {
    const rawCookie = adminAuth.cookie.join('; ');
    const refreshResp = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/refresh',
      method: 'POST',
      headers: { Cookie: rawCookie },
    });
    p2RefreshOk = refreshResp.statusCode === 200 && !!refreshResp.data?.accessToken;
  }
  console.log(`  5. Refresh Token Rotation: ${p2RefreshOk ? 'PASS' : 'FAIL'}`);

  const unauthResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
  });
  const p2401Ok = unauthResp.statusCode === 401;
  console.log(`  6. 401 Unauthenticated Protection: ${p2401Ok ? 'PASS' : 'FAIL'}`);

  const unauthCreate = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/cameras',
      method: 'POST',
      headers: { Authorization: `Bearer ${opAuth.token}` },
    },
    JSON.stringify({ name: 'Test Cam' }),
  );
  const p2403Ok = unauthCreate.statusCode === 403;
  console.log(`  7. 403 Forbidden Protection: ${p2403Ok ? 'PASS' : 'FAIL'}`);

  const logoutResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const p2LogoutOk = logoutResp.statusCode === 200;
  console.log(`  8. Logout: ${p2LogoutOk ? 'PASS' : 'FAIL'}`);

  results.regression.phase2 =
    p2LoginAdmin && p2LoginSup && p2LoginOp && p2MeOk && p2RefreshOk && p2401Ok && p2403Ok && p2LogoutOk;

  // Re-login Admin for Phase 3 & 4
  const adminAuth2 = await login('admin@police.gujarat.gov.in', 'Admin@1234');

  // PHASE 3
  console.log('\n--- Phase 3 Regression ---');
  const camList = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras?page=1&limit=5',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth2.token}` },
  });
  const p3ListOk = camList.statusCode === 200 && Array.isArray(camList.data?.items);
  console.log(`  1. /api/cameras list pagination: ${p3ListOk ? 'PASS' : 'FAIL'}`);

  const searchResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras?search=Iskcon',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth2.token}` },
  });
  const p3SearchOk = searchResp.statusCode === 200 && searchResp.data?.items?.length > 0;
  console.log(`  2. Camera search: ${p3SearchOk ? 'PASS' : 'FAIL'}`);

  const filterResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras?status=ONLINE&cameraType=PTZ',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth2.token}` },
  });
  const p3FilterOk = filterResp.statusCode === 200 && filterResp.data?.items?.length > 0;
  console.log(`  3. Camera filters (status/type): ${p3FilterOk ? 'PASS' : 'FAIL'}`);

  const geoJsonResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth2.token}` },
  });
  const p3GeoJsonOk =
    geoJsonResp.statusCode === 200 &&
    geoJsonResp.data?.type === 'FeatureCollection' &&
    Array.isArray(geoJsonResp.data?.features);
  console.log(`  4. Safe GeoJSON FeatureCollection: ${p3GeoJsonOk ? 'PASS' : 'FAIL'}`);

  results.regression.phase3 = p3ListOk && p3SearchOk && p3FilterOk && p3GeoJsonOk;

  // PHASE 4
  console.log('\n--- Phase 4 Regression ---');
  const bboxResp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?bbox=72.4,22.9,72.7,23.2',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth2.token}` },
  });
  const p4BboxOk = bboxResp.statusCode === 200 && bboxResp.data?.type === 'FeatureCollection';
  console.log(`  1. Spatial Bounding Box Envelope Filtering (PostGIS): ${p4BboxOk ? 'PASS' : 'FAIL'}`);

  console.log('  2. Testing frontend /map route in headless Chrome...');
  const mapBrowser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const mapPage = await mapBrowser.newPage();
  let mapRendered = false;
  try {
    await mapPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await mapPage.waitForSelector('#officer-email');
    await mapPage.type('#officer-email', 'admin@police.gujarat.gov.in');
    await mapPage.type('#officer-password', 'Admin@1234');
    await mapPage.click('#login-submit-btn');
    await mapPage.waitForNavigation({ waitUntil: 'networkidle2' });

    // Navigate to /map
    await mapPage.goto('http://localhost:5173/map', { waitUntil: 'networkidle2' });
    await mapPage.waitForSelector('.leaflet-container', { timeout: 10000 });
    const leafletExists = await mapPage.evaluate(() => !!document.querySelector('.leaflet-container'));
    mapRendered = leafletExists;
  } catch (err) {
    console.error('     Map render error:', err.message);
  } finally {
    await mapBrowser.close();
  }
  console.log(`  3. Leaflet + OpenStreetMap Map Rendering: ${mapRendered ? 'PASS' : 'FAIL'}`);

  results.regression.phase4 = p4BboxOk && mapRendered;

  console.log('\n===============================================================');
  console.log('FINAL RESULTS SUMMARY');
  console.log('===============================================================');
  console.log('Browser Playback:');
  console.log(`  - Hls.js: ${results.browser.hlsInit ? 'PASS' : 'FAIL'}`);
  console.log(`  - Playlist: ${results.browser.playlistLoaded ? 'PASS' : 'FAIL'}`);
  console.log(`  - Media: ${results.browser.mediaLoaded ? 'PASS' : 'FAIL'}`);
  console.log(`  - Actual playback: ${results.browser.actualPlayback ? 'PASS' : 'FAIL'}`);
  console.log(`  - Playback progression: ${results.browser.progression ? 'PASS' : 'FAIL'}`);

  console.log('\nInactive Camera Protection:');
  console.log(`  - Status: ${results.inactiveCamera.appropriateStatus ? 'PASS' : 'FAIL'}`);
  console.log(`  - FFmpeg process prevention: ${results.inactiveCamera.processPrevented ? 'PASS' : 'FAIL'}`);
  console.log(`  - Recovery after reactivation: ${results.inactiveCamera.reactivationRecovery ? 'PASS' : 'FAIL'}`);

  console.log('\nRegression:');
  console.log(`  - Phase 1 Regression: ${results.regression.phase1 ? 'PASS' : 'FAIL'}`);
  console.log(`  - Phase 2 Regression: ${results.regression.phase2 ? 'PASS' : 'FAIL'}`);
  console.log(`  - Phase 3 Regression: ${results.regression.phase3 ? 'PASS' : 'FAIL'}`);
  console.log(`  - Phase 4 Regression: ${results.regression.phase4 ? 'PASS' : 'FAIL'}`);

  const allBrowserPass =
    results.browser.hlsInit &&
    results.browser.playlistLoaded &&
    results.browser.mediaLoaded &&
    results.browser.actualPlayback &&
    results.browser.progression;

  const allInactivePass =
    results.inactiveCamera.appropriateStatus &&
    results.inactiveCamera.processPrevented &&
    results.inactiveCamera.reactivationRecovery;

  const allRegressionPass =
    results.regression.phase1 &&
    results.regression.phase2 &&
    results.regression.phase3 &&
    results.regression.phase4;

  const finalStatus =
    allBrowserPass && allInactivePass && allRegressionPass ? 'COMPLETE' : 'PARTIALLY COMPLETE';

  console.log(`\nFinal Phase 5 Status: ${finalStatus}`);
  console.log('===============================================================');

  if (finalStatus !== 'COMPLETE') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
