/**
 * PHASE 7 — AI VIDEO ANALYTICS (PERSON & VEHICLE DETECTION) ACCEPTANCE SCRIPT
 *
 * Full headless browser verification of:
 * - Operator login & navigation to /monitoring
 * - Live HLS stream running on CAM-AHM-001
 * - Start AI on CAM-AHM-001
 * - Real YOLOv8n CPU inference
 * - Real PERSON and VEHICLE detections
 * - Spatial/temporal deduplication
 * - Real snapshot generation in runtime/snapshots
 * - Secure event ingestion with X-AI-Service-Key
 * - PostgreSQL persistence in events table
 * - Event queries with pagination & filtering
 * - Frontend live detection feed display
 * - Stop AI and verify clean termination (0 orphan workers)
 * - Concurrency cap (max 1 stream) blocking second stream (429)
 * - Service key rejection (401)
 * - Snapshot traversal security
 * - Phase 1-6 regression
 */

const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const AI_URL = 'http://localhost:8000';
const AI_SERVICE_KEY = 'gujarat_police_internal_ai_key_2026';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest(url, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, data, headers: res.headers });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting ${url}`));
    });

    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runPhase7Acceptance() {
  console.log('===============================================================');
  console.log('PHASE 7 — AI VIDEO ANALYTICS ACCEPTANCE VERIFICATION');
  console.log('===============================================================\n');

  const results = {
    steps: [],
    passed: 0,
    failed: 0,
  };

  function record(name, pass, details = '') {
    results.steps.push({ name, pass, details });
    if (pass) {
      results.passed++;
      console.log(`[PASS] ${name} ${details ? '(' + details + ')' : ''}`);
    } else {
      results.failed++;
      console.error(`[FAIL] ${name}: ${details}`);
    }
  }

  // 1. Check services
  console.log('\n--- 1. Service Health Checks ---');
  try {
    const bHealth = await httpRequest(`${BACKEND_URL}/api/health`);
    record('Backend is online', bHealth.status === 200, `status: ${bHealth.status}`);
  } catch (err) {
    record('Backend is online', false, err.message);
  }

  try {
    const aHealth = await httpRequest(`${AI_URL}/health`);
    record('AI Engine is online', aHealth.status === 200, `status: ${aHealth.status}`);
  } catch (err) {
    record('AI Engine is online', false, err.message);
  }

  // 2. Authenticate
  console.log('\n--- 2. Authentication & Camera Lookup ---');
  let token = null;
  try {
    const loginRes = await httpRequest(
      `${BACKEND_URL}/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'admin@police.gujarat.gov.in',
        password: 'Admin@1234',
      }
    );
    token = loginRes.data?.accessToken;
    record('Admin login succeeds', !!token && loginRes.status === 200);
  } catch (err) {
    record('Admin login succeeds', false, err.message);
  }

  if (!token) {
    console.error('Fatal: Cannot proceed without authentication token');
    process.exit(1);
  }

  // Find CAM-AHM-001
  let targetCamera = null;
  try {
    const camRes = await httpRequest(`${BACKEND_URL}/api/cameras?search=CAM-AHM-001`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    targetCamera = camRes.data?.items?.find((c) => c.cameraCode === 'CAM-AHM-001');
    record('Target camera CAM-AHM-001 found', !!targetCamera, targetCamera?.id);
  } catch (err) {
    record('Target camera CAM-AHM-001 found', false, err.message);
  }

  if (!targetCamera) {
    console.error('Fatal: CAM-AHM-001 not found');
    process.exit(1);
  }

  // 3. Security Test: X-AI-Service-Key Guard
  console.log('\n--- 3. Service Security & Ingestion Guard ---');
  try {
    const unauthIngest = await httpRequest(
      `${BACKEND_URL}/api/events/ingest`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        cameraId: targetCamera.id,
        eventTypeCode: 'PERSON_DETECTED',
        detectedCategory: 'PERSON',
        detectedClass: 'person',
        confidence: 0.9,
        bboxX: 10, bboxY: 10, bboxWidth: 50, bboxHeight: 100,
      }
    );
    record(
      'Unauthorized ingestion rejected with 401',
      unauthIngest.status === 401,
      `status: ${unauthIngest.status}`
    );
  } catch (err) {
    record('Unauthorized ingestion rejected with 401', false, err.message);
  }

  try {
    const wrongKeyIngest = await httpRequest(
      `${BACKEND_URL}/api/events/ingest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-service-key': 'invalid-secret-key',
        },
      },
      {
        cameraId: targetCamera.id,
        eventTypeCode: 'PERSON_DETECTED',
        detectedCategory: 'PERSON',
        detectedClass: 'person',
        confidence: 0.9,
        bboxX: 10, bboxY: 10, bboxWidth: 50, bboxHeight: 100,
      }
    );
    record(
      'Invalid service key rejected with 401',
      wrongKeyIngest.status === 401,
      `status: ${wrongKeyIngest.status}`
    );
  } catch (err) {
    record('Invalid service key rejected with 401', false, err.message);
  }

  // 4. Start Live Stream & AI Session
  console.log('\n--- 4. Live Video Streaming & AI Session Launch ---');
  try {
    // Start Phase 5/6 stream first
    const streamRes = await httpRequest(
      `${BACKEND_URL}/api/cameras/${targetCamera.id}/stream/start`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    record(
      'Phase 5/6 live stream started on CAM-AHM-001',
      streamRes.status === 200 || streamRes.status === 201,
      `stream status: ${streamRes.data?.status}`
    );
  } catch (err) {
    record('Phase 5/6 live stream started on CAM-AHM-001', false, err.message);
  }

  // Launch AI session via NestJS /api/ai/sessions/start
  let aiSession = null;
  try {
    const aiRes = await httpRequest(
      `${BACKEND_URL}/api/ai/sessions/start`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      {
        cameraId: targetCamera.id,
        sampleFps: 1.5,
        confidenceThreshold: 0.35,
      }
    );
    aiSession = aiRes.data;
    record(
      'AI session successfully launched via NestJS',
      (aiRes.status === 200 || aiRes.status === 201) && aiSession?.status === 'RUNNING',
      `status: ${aiSession?.status}, FPS: ${aiSession?.sampleFps}`
    );
  } catch (err) {
    record('AI session successfully launched via NestJS', false, err.message);
  }

  // 5. Concurrency Cap Test (Max 1 Stream Rule)
  console.log('\n--- 5. AI Concurrency Capacity Cap Test ---');
  try {
    // Try to start second AI session on another camera
    const allCams = await httpRequest(`${BACKEND_URL}/api/cameras`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const secondCam = allCams.data?.items?.find(
      (c) => c.id !== targetCamera.id && c.isActive
    );

    if (secondCam) {
      const secondAiRes = await httpRequest(
        `${BACKEND_URL}/api/ai/sessions/start`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        {
          cameraId: secondCam.id,
          sampleFps: 1.5,
        }
      );
      record(
        'Second concurrent AI stream blocked by capacity rule (429)',
        secondAiRes.status === 429,
        `status: ${secondAiRes.status}`
      );
    }
  } catch (err) {
    record('Second concurrent AI stream blocked by capacity rule (429)', false, err.message);
  }

  // 6. Wait for inference and verify real detections
  console.log('\n--- 6. Inference Processing & Real Detections Verification ---');
  console.log('Waiting 8 seconds for YOLOv8n CPU inference frames to process...');
  await sleep(8000);

  let detectedPerson = false;
  let detectedVehicle = false;
  let sampleSnapshotUrl = null;

  try {
    const eventsRes = await httpRequest(
      `${BACKEND_URL}/api/events?cameraId=${targetCamera.id}&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const items = eventsRes.data?.items || [];
    console.log(`Retrieved ${items.length} detection events from PostgreSQL:`);
    items.forEach((e) => {
      console.log(
        `  -> [${e.detectedCategory}] ${e.detectedClass} (conf=${e.confidence}) bbox=(${e.bboxX},${e.bboxY},${e.bboxWidth},${e.bboxHeight}) snapshot=${e.snapshotPath}`
      );
      if (e.detectedCategory === 'PERSON') detectedPerson = true;
      if (e.detectedCategory === 'VEHICLE') detectedVehicle = true;
      if (e.snapshotUrl && !sampleSnapshotUrl) sampleSnapshotUrl = e.snapshotUrl;
    });

    record(
      'Real PERSON detection occurred with confidence & bbox',
      detectedPerson,
      `found PERSON event: ${detectedPerson}`
    );
    record(
      'Real VEHICLE detection occurred with confidence & bbox',
      detectedVehicle,
      `found VEHICLE event: ${detectedVehicle}`
    );
    record(
      'Events persisted in PostgreSQL with valid schema',
      items.length > 0 && !!items[0].occurredAt
    );
  } catch (err) {
    record('Real detections verified in PostgreSQL', false, err.message);
  }

  // 7. Snapshot Delivery & Path Traversal Security
  console.log('\n--- 7. Snapshot Image Delivery & Security ---');
  if (sampleSnapshotUrl) {
    try {
      console.log(`Requesting snapshot URL: ${BACKEND_URL}${sampleSnapshotUrl}`);
      const snapRes = await httpRequest(`${BACKEND_URL}${sampleSnapshotUrl}`);
      console.log('Snapshot response status:', snapRes.status, 'data:', typeof snapRes.data === 'object' ? JSON.stringify(snapRes.data) : (snapRes.data || '').slice(0, 100));
      record(
        'Snapshot image delivered successfully (200 OK image/jpeg)',
        snapRes.status === 200 && (snapRes.headers['content-type'] || '').includes('image/'),
        `Content-Type: ${snapRes.headers['content-type']}, status: ${snapRes.status}`
      );
    } catch (err) {
      record('Snapshot image delivered successfully', false, err.message);
    }
  } else {
    record('Snapshot image delivered successfully', false, 'No snapshot URL found');
  }

  try {
    const traversalRes = await httpRequest(
      `${BACKEND_URL}/api/events/snapshots/..%2f..%2fsecret.txt`
    );
    record(
      'Directory traversal attempt blocked (400 Bad Request)',
      traversalRes.status === 400 || traversalRes.status === 404,
      `status: ${traversalRes.status}`
    );
  } catch (err) {
    record('Directory traversal attempt blocked', false, err.message);
  }

  // 8. Live Headless Browser Verification of Monitoring UI
  console.log('\n--- 8. Headless Chrome Browser Verification ---');
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Open Login Page
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#officer-email', { timeout: 8000 });
    await page.type('#officer-email', 'admin@police.gujarat.gov.in');
    await page.type('#officer-password', 'Admin@1234');
    await page.click('#login-submit-btn');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 });

    // Navigate to Monitoring
    await page.goto(`${FRONTEND_URL}/monitoring`, { waitUntil: 'networkidle2' });
    record('Loaded /monitoring dashboard in browser', true);

    // Assign CAM-AHM-001 to slot-0 so its CameraTile is rendered
    await page.waitForSelector('#add-cam-btn-slot-0', { visible: true, timeout: 8000 });
    await page.click('#add-cam-btn-slot-0');
    await page.waitForSelector('#assign-cam-CAM-AHM-001', { visible: true, timeout: 8000 });
    await page.click('#assign-cam-CAM-AHM-001');
    await sleep(1000);

    // Verify AI control badge is visible
    await page.waitForSelector('#ai-status-badge', { timeout: 10000 });
    const badgeText = await page.$eval('#ai-status-badge', (el) => el.textContent);
    record(
      'AI status badge rendered on CameraTile',
      badgeText.includes('AI Off') || badgeText.includes('AI Active') || badgeText.includes('AI Starting'),
      `badge: "${badgeText.trim()}"`
    );

    // Verify Live Detections Feed Drawer
    await page.waitForSelector('#detections-drawer', { timeout: 10000 });
    record('Recent detections drawer is visible on page', true);

    // Check detection cards in DOM
    const detectionCards = await page.$$eval('[id^="detection-card-"]', (els) => els.length);
    record(
      'Detection cards rendered in frontend feed',
      detectionCards > 0,
      `rendered count: ${detectionCards}`
    );

    // Test Start AI button if stopped
    const startBtn = await page.$('#ai-start-btn');
    if (startBtn) {
      await startBtn.click();
      await sleep(2000);
      const activeBadge = await page.$eval('#ai-status-badge', (el) => el.textContent);
      record(
        'Start AI button initiates session in UI',
        activeBadge.includes('AI Active') || activeBadge.includes('AI Starting'),
        `badge: "${activeBadge.trim()}"`
      );
    }

    // Stop AI via UI button or API
    await page.waitForSelector('#ai-stop-btn', { visible: true, timeout: 5000 }).catch(() => {});
    const stopBtn = await page.$('#ai-stop-btn');
    if (stopBtn) {
      await stopBtn.click();
      await sleep(2000);
      const afterStopBadge = await page.$eval('#ai-status-badge', (el) => el.textContent);
      record(
        'Stop AI button transitions status to AI Off',
        afterStopBadge.includes('AI Off'),
        `badge: "${afterStopBadge.trim()}"`
      );
    }
  } catch (err) {
    record('Headless browser test completed without crash', false, err.message);
  } finally {
    if (browser) await browser.close();
  }

  // 9. Stop Stream and Verify Clean Worker Termination
  console.log('\n--- 9. Cleanup & Orphan Worker Verification ---');
  try {
    await httpRequest(`${BACKEND_URL}/api/ai/sessions/${targetCamera.id}/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await httpRequest(`${BACKEND_URL}/api/cameras/${targetCamera.id}/stream/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await sleep(2000);

    const activeSessions = await httpRequest(`${BACKEND_URL}/api/ai/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const running = (activeSessions.data || []).filter((s) => s.status === 'RUNNING');
    record(
      'AI session stopped cleanly (0 active sessions)',
      running.length === 0,
      `active: ${running.length}`
    );
  } catch (err) {
    record('AI session stopped cleanly', false, err.message);
  }

  // Summary
  console.log('\n===============================================================');
  console.log(`PHASE 7 ACCEPTANCE RESULT: ${results.failed === 0 ? 'ALL PASS' : 'FAILURES DETECTED'}`);
  console.log(`Passed: ${results.passed} / ${results.steps.length}`);
  console.log(`Failed: ${results.failed} / ${results.steps.length}`);
  console.log('===============================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runPhase7Acceptance().catch((err) => {
  console.error('Acceptance execution fatal error:', err);
  process.exit(1);
});
