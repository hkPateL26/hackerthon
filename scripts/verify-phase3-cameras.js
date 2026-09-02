/**
 * Phase 3 Live End-to-End Camera Registry & Security Verification
 */
const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
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

async function login(email, password) {
  const resp = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST' },
    JSON.stringify({ email, password }),
  );
  return resp.data?.accessToken;
}

async function run() {
  console.log('==================================================');
  console.log('PHASE 3 CAMERA REGISTRY LIVE SECURITY & API VERIFICATION');
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

  // 1. Authentication
  console.log('--- 1. Authenticating Demo Accounts ---');
  const adminToken = await login('admin@police.gujarat.gov.in', 'Admin@1234');
  const operatorToken = await login('operator@police.gujarat.gov.in', 'Operator@1234');
  const supervisorToken = await login('supervisor@police.gujarat.gov.in', 'Supervisor@1234');
  assert(!!adminToken, 'Admin token acquired');
  assert(!!operatorToken, 'Operator token acquired');
  assert(!!supervisorToken, 'Supervisor token acquired');

  // 2. List Cameras with Pagination & Search
  console.log('\n--- 2. GET /api/cameras (Pagination & Safe Response) ---');
  const listResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras?page=1&limit=5',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(listResp.statusCode === 200, 'GET /api/cameras returned 200 OK');
  assert(Array.isArray(listResp.data?.items), 'Items array present');
  assert(listResp.data?.total >= 14, `Total seeded cameras count verified (${listResp.data?.total})`);
  assert(listResp.data?.limit === 5, 'Page limit correctly applied');
  assert(listResp.data?.page === 1, 'Current page is 1');

  const firstCam = listResp.data?.items?.[0];
  assert(!!firstCam?.cameraCode, 'Camera code present in response');
  assert(firstCam?.district?.name !== undefined, 'District relation loaded');
  assert(firstCam?.policeStation?.name !== undefined, 'Police station relation loaded');
  assert(
    !firstCam?.streamUrl || firstCam.streamUrl.includes('***:***@') || !firstCam.streamUrl.includes(':'),
    'RTSP credentials properly redacted in response',
    firstCam?.streamUrl || 'none',
  );

  // 3. Search & Filter
  console.log('\n--- 3. Search & Filtering ---');
  const searchResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras?search=Iskcon',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(searchResp.statusCode === 200, 'Search query returned 200 OK');
  assert(
    searchResp.data?.items?.some((c) => c.name.includes('Iskcon') || c.locationName.includes('Iskcon')),
    'Search successfully returned matching camera',
  );

  // 4. Master Data (Districts & Police Stations)
  console.log('\n--- 4. Master Data Endpoints ---');
  const distResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/districts',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(distResp.statusCode === 200, 'Districts endpoint returned 200 OK');
  assert(distResp.data?.length >= 5, `Seeded districts found (${distResp.data?.length})`);

  const sampleDistrictId = distResp.data?.[0]?.id;
  const psResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/police-stations?districtId=${sampleDistrictId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(psResp.statusCode === 200, 'Police stations filtered endpoint returned 200 OK');
  assert(psResp.data?.length >= 1, `Police stations for district returned (${psResp.data?.length})`);
  const samplePsId = psResp.data?.[0]?.id;

  // 5. GeoJSON FeatureCollection
  console.log('\n--- 5. GeoJSON Endpoint (RFC 7946) ---');
  const geoResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(geoResp.statusCode === 200, 'GeoJSON endpoint returned 200 OK');
  assert(geoResp.data?.type === 'FeatureCollection', 'Root type is FeatureCollection');
  assert(Array.isArray(geoResp.data?.features), 'Features array present');
  const sampleFeature = geoResp.data?.features?.[0];
  assert(sampleFeature?.geometry?.type === 'Point', 'Feature geometry is Point');
  assert(
    Array.isArray(sampleFeature?.geometry?.coordinates) && sampleFeature.geometry.coordinates.length === 2,
    'Feature coordinates are [longitude, latitude]',
    JSON.stringify(sampleFeature?.geometry?.coordinates),
  );
  assert(!!sampleFeature?.properties?.cameraCode, 'Feature properties contain cameraCode');

  // 6. Create Camera (ADMIN only)
  console.log('\n--- 6. Camera Creation (ADMIN) ---');
  const newCameraCode = `CAM-TEST-${Date.now().toString().slice(-4)}`;
  const createResp = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/cameras',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    JSON.stringify({
      cameraCode: newCameraCode,
      name: 'Test Surveillance Camera Alpha',
      cameraType: 'PTZ',
      vendor: 'Hikvision',
      model: 'DS-2DF8442IXS',
      ipAddress: '192.168.99.10',
      port: 554,
      rtspUrl: 'rtsp://admin:SecretPass123@192.168.99.10:554/live',
      locationName: 'Test Junction',
      districtId: sampleDistrictId,
      policeStationId: samplePsId,
      latitude: 23.05,
      longitude: 72.55,
      status: 'ONLINE',
      isActive: true,
    }),
  );
  if (createResp.statusCode !== 201) {
    console.log('Create error details:', JSON.stringify(createResp.data));
  }
  assert(createResp.statusCode === 201, 'Admin camera creation returned 201 Created', `Got ${createResp.statusCode}`);
  const createdCamId = createResp.data?.id;
  assert(!!createdCamId, 'Created camera returned valid ID');
  assert(createResp.data?.streamUrl === 'rtsp://***:***@192.168.99.10:554/live', 'Created camera stream credentials redacted');

  // 7. RBAC Check: OPERATOR cannot create camera (403)
  console.log('\n--- 7. RBAC Enforcement on Creation (OPERATOR -> 403) ---');
  const opCreateResp = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/cameras',
      method: 'POST',
      headers: { Authorization: `Bearer ${operatorToken}` },
    },
    JSON.stringify({
      cameraCode: 'CAM-OP-FAIL',
      name: 'Operator Forbidden Camera',
      districtId: sampleDistrictId,
      policeStationId: samplePsId,
      latitude: 23.05,
      longitude: 72.55,
    }),
  );
  assert(opCreateResp.statusCode === 403, 'Operator camera creation denied with 403 Forbidden', `Got ${opCreateResp.statusCode}`);

  // 8. Duplicate Camera Code (409 Conflict)
  console.log('\n--- 8. Duplicate Camera Code Prevention (409 Conflict) ---');
  const dupResp = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/cameras',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    JSON.stringify({
      cameraCode: newCameraCode,
      name: 'Duplicate Camera',
      districtId: sampleDistrictId,
      policeStationId: samplePsId,
      latitude: 23.05,
      longitude: 72.55,
    }),
  );
  assert(dupResp.statusCode === 409, 'Duplicate camera code rejected with 409 Conflict', `Got ${dupResp.statusCode}`);

  // 9. Status Update (ADMIN / SUPERVISOR)
  console.log('\n--- 9. Camera Status Update (SUPERVISOR) ---');
  const statusResp = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/cameras/${createdCamId}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    },
    JSON.stringify({ status: 'MAINTENANCE' }),
  );
  assert(statusResp.statusCode === 200, 'Supervisor status update returned 200 OK');
  assert(statusResp.data?.status === 'MAINTENANCE', 'Camera status updated to MAINTENANCE');

  // 10. Activation / Deactivation (ADMIN)
  console.log('\n--- 10. Camera Deactivate / Activate (ADMIN) ---');
  const deactResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${createdCamId}/deactivate`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(deactResp.statusCode === 200, 'Deactivate camera returned 200 OK');
  assert(deactResp.data?.isActive === false, 'Camera isActive is false');

  const actResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${createdCamId}/activate`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(actResp.statusCode === 200, 'Activate camera returned 200 OK');
  assert(actResp.data?.isActive === true, 'Camera isActive is true');

  // 11. Soft Delete (ADMIN)
  console.log('\n--- 11. Soft Delete Camera (ADMIN) ---');
  const delResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${createdCamId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(delResp.statusCode === 200, 'Soft delete returned 200 OK');

  const getDeleted = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/${createdCamId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(getDeleted.statusCode === 404, 'Soft deleted camera is not returned in single lookup (404 Not Found)');

  // 12. Unauthenticated Access (401)
  console.log('\n--- 12. Unauthenticated Access (401) ---');
  const unauthResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras',
    method: 'GET',
  });
  assert(unauthResp.statusCode === 401, 'Unauthenticated camera access returned 401 Unauthorized');

  // 13. Latitude / Longitude Validation (400)
  console.log('\n--- 13. DTO Coordinate Validation (400) ---');
  const badCoordResp = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/cameras',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    JSON.stringify({
      cameraCode: 'CAM-BAD-COORD',
      name: 'Invalid Coordinates Camera',
      districtId: sampleDistrictId,
      policeStationId: samplePsId,
      latitude: 150.0, // Invalid lat > 90
      longitude: 72.55,
    }),
  );
  assert(badCoordResp.statusCode === 400, 'Out-of-range latitude rejected with 400 Bad Request');

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} / ${total} CHECKS PASSED`);
  console.log('==================================================');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
