/**
 * Phase 4 Live GIS Camera Mapping & Spatial Security Verification
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
  console.log('PHASE 4 GIS CAMERA MAPPING LIVE SECURITY & SPATIAL VERIFICATION');
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

  // 2. Fetch Full GeoJSON FeatureCollection
  console.log('\n--- 2. GET /api/cameras/geojson (RFC 7946 Standard) ---');
  const geoResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(geoResp.statusCode === 200, 'GeoJSON endpoint returned 200 OK');
  assert(geoResp.data?.type === 'FeatureCollection', 'Root type is FeatureCollection');
  assert(Array.isArray(geoResp.data?.features), 'Features is an array');
  assert(geoResp.data?.features?.length === 13, `All 13 active cameras present (${geoResp.data?.features?.length})`);

  // Test inactive filter
  const inactiveResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?isActive=false',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  if (inactiveResp.data?.features?.length !== 1) {
    console.log('Inactive features received:', JSON.stringify(inactiveResp.data?.features));
  }
  assert(inactiveResp.statusCode === 200, 'Inactive GeoJSON returned 200 OK');
  assert(
    inactiveResp.data?.features?.length === 1 &&
      inactiveResp.data?.features?.[0]?.properties?.cameraCode === 'CAM-GAN-003',
    'Inactive camera query returned CAM-GAN-003',
  );

  const firstFeature = geoResp.data?.features?.[0];
  assert(firstFeature?.type === 'Feature', 'Feature type is Feature');
  assert(firstFeature?.geometry?.type === 'Point', 'Geometry type is Point');
  assert(
    Array.isArray(firstFeature?.geometry?.coordinates) && firstFeature.geometry.coordinates.length === 2,
    'Coordinates are [longitude, latitude]',
    JSON.stringify(firstFeature?.geometry?.coordinates),
  );
  assert(
    firstFeature?.geometry?.coordinates[0] >= 68.0 && firstFeature?.geometry?.coordinates[0] <= 75.0,
    'Longitude coordinate in valid Gujarat range (68°E..75°E)',
  );
  assert(
    firstFeature?.geometry?.coordinates[1] >= 20.0 && firstFeature?.geometry?.coordinates[1] <= 25.0,
    'Latitude coordinate in valid Gujarat range (20°N..25°N)',
  );

  // 3. Credential Redaction in GeoJSON Properties
  console.log('\n--- 3. Credential Redaction in GeoJSON Properties ---');
  const props = firstFeature?.properties;
  assert(!!props?.cameraCode, 'Camera code present in properties');
  assert(!!props?.name, 'Camera name present in properties');
  assert(!!props?.district, 'District name present in properties');
  assert(!!props?.policeStation, 'Police station name present in properties');
  assert(
    !props?.streamUrl || props.streamUrl.includes('***:***@') || !props.streamUrl.includes(':'),
    'RTSP stream credentials properly redacted',
    props?.streamUrl || 'none',
  );
  assert(props?.rtspUrl === undefined, 'Raw rtspUrl property is not exposed');
  assert(props?.password === undefined, 'Password property is not exposed');

  // 4. District Filtering on GeoJSON
  console.log('\n--- 4. District Filtering on GeoJSON ---');
  const distListResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/districts',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  const ahmedabadId = distListResp.data?.find((d) => d.name.includes('Ahmedabad'))?.id;
  assert(!!ahmedabadId, 'Ahmedabad district UUID found', ahmedabadId);

  const ahmGeoResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/cameras/geojson?districtId=${ahmedabadId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(ahmGeoResp.statusCode === 200, 'Filtered district GeoJSON returned 200 OK');
  assert(
    ahmGeoResp.data?.features?.length === 4,
    `Ahmedabad district returns exact 4 cameras (${ahmGeoResp.data?.features?.length})`,
  );
  assert(
    ahmGeoResp.data?.features?.every((f) => f.properties.district === 'Ahmedabad City'),
    'All returned features belong to Ahmedabad City',
  );

  // 5. Status and Type Filtering on GeoJSON
  console.log('\n--- 5. Status & Type Filtering on GeoJSON ---');
  const statusGeoResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?status=ONLINE',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(statusGeoResp.statusCode === 200, 'Status filter GeoJSON returned 200 OK');
  assert(
    statusGeoResp.data?.features?.every((f) => f.properties.status === 'ONLINE'),
    'All returned features have ONLINE status',
  );

  const typeGeoResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?cameraType=PTZ',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(typeGeoResp.statusCode === 200, 'Camera type filter GeoJSON returned 200 OK');
  assert(
    typeGeoResp.data?.features?.every((f) => f.properties.cameraType === 'PTZ'),
    'All returned features are PTZ cameras',
  );

  // 6. Search Filtering on GeoJSON
  console.log('\n--- 6. Search Filter on GeoJSON ---');
  const searchGeoResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?search=Vidhan+Sabha',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(searchGeoResp.statusCode === 200, 'Search GeoJSON returned 200 OK');
  assert(searchGeoResp.data?.features?.length === 1, 'Search returned exactly 1 matching camera');
  assert(
    searchGeoResp.data?.features?.[0]?.properties?.cameraCode === 'CAM-GAN-001',
    'Matched Vidhan Sabha camera CAM-GAN-001',
  );

  // 7. Spatial Bounding Box (BBox) Query using PostGIS ST_MakeEnvelope
  console.log('\n--- 7. Spatial Bounding Box (BBox) PostGIS Query ---');
  // Envelope around Ahmedabad City: minLng=72.48, minLat=23.00, maxLng=72.58, maxLat=23.06
  const bboxResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?bbox=72.48,23.00,72.58,23.06',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(bboxResp.statusCode === 200, 'Valid bbox query returned 200 OK');
  assert(
    bboxResp.data?.features?.length >= 3,
    `Ahmedabad bounding box returned cameras within envelope (${bboxResp.data?.features?.length})`,
  );
  assert(
    bboxResp.data?.features?.every((f) => {
      const [lng, lat] = f.geometry.coordinates;
      return lng >= 72.48 && lng <= 72.58 && lat >= 23.00 && lat <= 23.06;
    }),
    'All returned points strictly fall within spatial envelope',
  );

  // Empty bbox area (Arabian Sea: 68.0,18.0,69.0,19.0)
  const emptyBboxResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?bbox=68.0,18.0,69.0,19.0',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(emptyBboxResp.statusCode === 200, 'Empty spatial envelope returned 200 OK');
  assert(emptyBboxResp.data?.features?.length === 0, 'No cameras returned for empty envelope (0)');

  // 8. BBox Validation and Rejections
  console.log('\n--- 8. BBox Validation and Error Handling ---');
  const badBboxFormat = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?bbox=invalid-text',
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(badBboxFormat.statusCode === 400, 'Malformed bbox string rejected with 400 Bad Request');

  const outOfRangeBbox = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?bbox=72.0,150.0,73.0,24.0', // lat > 90
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(outOfRangeBbox.statusCode === 400, 'Out-of-range latitude bbox rejected with 400 Bad Request');

  const invertedBbox = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson?bbox=75.0,23.0,72.0,24.0', // minLng > maxLng
    method: 'GET',
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert(invertedBbox.statusCode === 400, 'Inverted minLng > maxLng bbox rejected with 400 Bad Request');

  // 9. RBAC Verification (All roles can read GIS, Unauthenticated 401)
  console.log('\n--- 9. RBAC & Authentication Checks ---');
  const unauthResp = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson',
    method: 'GET',
  });
  assert(unauthResp.statusCode === 401, 'Unauthenticated GeoJSON request rejected with 401 Unauthorized');

  const adminGeo = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminGeo.statusCode === 200, 'ADMIN has read access to GeoJSON (200 OK)');

  const supervisorGeo = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras/geojson',
    method: 'GET',
    headers: { Authorization: `Bearer ${supervisorToken}` },
  });
  assert(supervisorGeo.statusCode === 200, 'SUPERVISOR has read access to GeoJSON (200 OK)');

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} / ${total} CHECKS PASSED`);
  console.log('==================================================');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
