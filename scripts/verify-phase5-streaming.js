/**
 * Phase 5 Live Video Ingestion & Stream Integration Verification
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({ ...options, headers }, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json || text,
          rawBuffer: buffer,
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function login(email, password) {
  const resp = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST' },
    JSON.stringify({ email, password }),
  );
  return resp.data?.accessToken;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('==================================================');
  console.log('PHASE 5 VIDEO INGESTION & STREAM LIVE VERIFICATION');
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

  // 1. Authenticate Demo Accounts
  console.log('--- 1. Authenticating Demo Accounts ---');
  const adminToken = await login('admin@police.gujarat.gov.in', 'Admin@1234');
  const operatorToken = await login('operator@police.gujarat.gov.in', 'Operator@1234');
  const supervisorToken = await login('supervisor@police.gujarat.gov.in', 'Supervisor@1234');
  assert(!!adminToken, 'Admin token acquired');
  assert(!!operatorToken, 'Operator token acquired');
  assert(!!supervisorToken, 'Supervisor token acquired');

  // 2. Fetch Active Camera
  console.log('\n--- 2. Fetch Active Camera for Stream Ingestion ---');
  const camListResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras?search=CAM-AHM-001',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  const camera = camListResp.data?.items?.[0];
  assert(!!camera?.id, 'Found active camera CAM-AHM-001', camera?.id);

  // 3. Start Stream Ingestion (Operator)
  console.log('\n--- 3. POST /api/cameras/:id/stream/start (Operator) ---');
  const startResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${camera.id}/stream/start`,
    method: 'POST',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(startResp.statusCode === 200, 'Stream start returned 200 OK');
  assert(startResp.data?.status === 'RUNNING', 'Stream status is RUNNING');
  assert(startResp.data?.sourceType === 'FILE', 'Source type is FILE (Prototype MP4 loop)');
  assert(
    startResp.data?.playbackUrl === `/api/streams/hls/${camera.id}/index.m3u8`,
    'Safe playback URL returned',
    startResp.data?.playbackUrl,
  );

  // 4. Idempotent Start
  console.log('\n--- 4. Idempotent Start Verification ---');
  const duplicateStart = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${camera.id}/stream/start`,
    method: 'POST',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(duplicateStart.statusCode === 200, 'Duplicate start returned 200 OK');
  assert(duplicateStart.data?.status === 'RUNNING', 'Status remains RUNNING');

  // 5. Allow FFmpeg to generate HLS segments (wait 4s)
  console.log('\n--- 5. Waiting for FFmpeg HLS segments on D: drive ---');
  await sleep(4000);

  const hlsDir = path.resolve(process.cwd(), 'runtime', 'hls', camera.id);
  const playlistOnDisk = path.join(hlsDir, 'index.m3u8');
  assert(fs.existsSync(playlistOnDisk), 'HLS playlist index.m3u8 exists on D: drive', playlistOnDisk);

  // 6. Deliver HLS Playlist & Segments via API
  console.log('\n--- 6. GET /api/streams/hls/:cameraId/index.m3u8 ---');
  const playlistResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/streams/hls/${camera.id}/index.m3u8`,
    method: 'GET',
  });
  assert(playlistResp.statusCode === 200, 'Playlist endpoint returned 200 OK');
  assert(
    playlistResp.headers['content-type']?.includes('application/vnd.apple.mpegurl'),
    'Content-Type is application/vnd.apple.mpegurl',
  );
  assert(
    typeof playlistResp.data === 'string' && playlistResp.data.includes('#EXTM3U'),
    'Playlist contains valid #EXTM3U header',
  );

  // Parse first segment filename from playlist
  const segmentMatch = (typeof playlistResp.data === 'string' ? playlistResp.data : '').match(/segment-\d+\.ts/);
  const segmentFileName = segmentMatch ? segmentMatch[0] : 'segment-000.ts';

  console.log(`\n--- 7. GET /api/streams/hls/:cameraId/${segmentFileName} ---`);
  const segmentResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/streams/hls/${camera.id}/${segmentFileName}`,
    method: 'GET',
  });
  assert(segmentResp.statusCode === 200, `Video segment ${segmentFileName} returned 200 OK`);
  assert(segmentResp.headers['content-type']?.includes('video/MP2T'), 'Content-Type is video/MP2T');
  assert(segmentResp.rawBuffer?.length > 1000, `Segment payload has binary video data (${segmentResp.rawBuffer?.length} bytes)`);

  // 8. Path Traversal Protection
  console.log('\n--- 8. Path Traversal & Security Protection ---');
  const traversalResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/streams/hls/${camera.id}/..%2fpackage.json`,
    method: 'GET',
  });
  assert(traversalResp.statusCode === 400, 'Path traversal request rejected with 400 Bad Request');

  const notFoundHls = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/streams/hls/${camera.id}/nonexistent.ts`,
    method: 'GET',
  });
  assert(notFoundHls.statusCode === 404, 'Non-existent segment rejected with 404 Not Found');

  // 9. Query Stream Status (Authenticated)
  console.log('\n--- 9. GET /api/cameras/:id/stream/status ---');
  const statusResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${camera.id}/stream/status`,
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(statusResp.statusCode === 200, 'Stream status endpoint returned 200 OK');
  assert(statusResp.data?.status === 'RUNNING', 'Polled status is RUNNING');

  // 10. Restart Stream RBAC (Supervisor permitted, Operator forbidden)
  console.log('\n--- 10. Restart Stream RBAC ---');
  const opRestart = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${camera.id}/stream/restart`,
    method: 'POST',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(opRestart.statusCode === 403, 'Operator restart rejected with 403 Forbidden');

  const supRestart = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${camera.id}/stream/restart`,
    method: 'POST',
    headers: { Authorization: `Bearer ${supervisorToken}` },
  });
  assert(supRestart.statusCode === 200, 'Supervisor restart succeeded with 200 OK');
  assert(supRestart.data?.status === 'RUNNING', 'Status after restart is RUNNING');

  // 11. Stop Stream
  console.log('\n--- 11. POST /api/cameras/:id/stream/stop ---');
  const stopResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${camera.id}/stream/stop`,
    method: 'POST',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(stopResp.statusCode === 200, 'Stream stop returned 200 OK');
  assert(stopResp.data?.status === 'STOPPED', 'Stream status updated to STOPPED');

  // 12. Inactive Camera Protection
  console.log('\n--- 12. Inactive Camera Stream Protection ---');
  const inactiveCamResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras?search=CAM-GAN-003&isActive=false',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const disabledCam = inactiveCamResp.data?.items?.[0];
  if (disabledCam) {
    const disabledStart = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/cameras/${disabledCam.id}/stream/start`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(disabledStart.statusCode === 400, 'Starting stream for disabled camera rejected with 400 Bad Request');
  }

  // 13. Unauthenticated Stream API
  console.log('\n--- 13. Unauthenticated Stream API Protection ---');
  const unauthStart = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${camera.id}/stream/start`,
    method: 'POST',
  });
  assert(unauthStart.statusCode === 401, 'Unauthenticated stream start rejected with 401 Unauthorized');

  // 14. Credential Redaction Check
  console.log('\n--- 14. Credential Redaction Verification ---');
  const streamInfo = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${camera.id}/stream`,
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(streamInfo.statusCode === 200, 'Stream details returned 200 OK');
  assert(
    !JSON.stringify(streamInfo.data).includes('Admin@1234') &&
      !JSON.stringify(streamInfo.data).includes('pass123'),
    'No sensitive passwords or secrets in stream API response',
  );

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} / ${total} CHECKS PASSED`);
  console.log('==================================================');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
