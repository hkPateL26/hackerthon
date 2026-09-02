/**
 * Phase 8 Orchestrator & Live Verification Runner
 */
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

function checkHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanPort(port) {
  try {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'ignore' },
    );
  } catch {}
}

function killFfmpeg() {
  try {
    execSync(
      'powershell -NoProfile -Command "Stop-Process -Name ffmpeg -Force -ErrorAction SilentlyContinue"',
      { stdio: 'ignore' },
    );
  } catch {}
}

async function main() {
  console.log('=== Cleaning ports 3000, 5173, 8000 and killing ffmpeg ===');
  cleanPort(3000);
  cleanPort(5173);
  cleanPort(8000);
  killFfmpeg();
  await sleep(1000);

  const pythonExe = 'D:\\Movies and Web se\\hackerthon\\ai-engine\\.venv\\Scripts\\python.exe';

  console.log('Starting AI Engine (FastAPI :8000)...');
  const aiProc = spawn(
    pythonExe,
    ['-m', 'uvicorn', 'main:app', '--port', '8000', '--host', '127.0.0.1'],
    {
      cwd: path.resolve('ai-engine'),
      stdio: 'ignore',
    },
  );

  console.log('Starting Backend (NestJS :3000)...');
  const backendProc = spawn('node', ['dist/main.js'], {
    cwd: path.resolve('backend'),
    stdio: 'ignore',
  });

  console.log('Starting Frontend Preview (:5173)...');
  const viteBin = path.resolve('frontend', 'node_modules', 'vite', 'bin', 'vite.js');
  const frontendProc = spawn('node', [viteBin, 'preview', '--port', '5173', '--host', '0.0.0.0'], {
    cwd: path.resolve('frontend'),
    stdio: 'ignore',
  });

  console.log('Waiting for services to become healthy...');
  let aiReady = false,
    backendReady = false,
    frontendReady = false;

  for (let i = 0; i < 40; i++) {
    if (!aiReady) aiReady = await checkHttp('http://localhost:8000/health');
    if (!backendReady) backendReady = await checkHttp('http://localhost:3000/api/health');
    if (!frontendReady) frontendReady = await checkHttp('http://localhost:5173/');

    if (aiReady && backendReady && frontendReady) {
      console.log('All 3 services are online and responding!');
      break;
    }
    await sleep(1000);
  }

  if (!aiReady || !backendReady || !frontendReady) {
    console.error('Failed to start all services within timeout:');
    console.error({ aiReady, backendReady, frontendReady });
    cleanup();
    process.exit(1);
  }

  function cleanup() {
    console.log('\n--- Tearing down services ---');
    try {
      if (frontendProc) frontendProc.kill();
      if (backendProc) backendProc.kill();
      if (aiProc) aiProc.kill();
    } catch {}
    cleanPort(3000);
    cleanPort(5173);
    cleanPort(8000);
    killFfmpeg();
    console.log('Cleanup complete.');
  }

  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(1);
  });

  console.log('\n--- Running Phase 8 Object Tracking Acceptance Script ---\n');
  try {
    execSync('node scripts/verify-phase8-tracking.js', { stdio: 'inherit' });
    console.log('\n>>> PHASE 8 LIVE VERIFICATION PASSED SUCCESSFULLY <<<\n');
  } catch (err) {
    console.error('\n>>> PHASE 8 LIVE VERIFICATION FAILED <<<\n');
    cleanup();
    process.exit(1);
  }

  console.log('\n--- Running Phase 7 Analytics Regression Verification ---\n');
  try {
    execSync('node scripts/verify-phase7-analytics.js', { stdio: 'inherit' });
    console.log('\n>>> PHASE 7 REGRESSION VERIFICATION PASSED <<<\n');
  } catch (err) {
    console.error('\n>>> PHASE 7 REGRESSION VERIFICATION FAILED <<<\n');
    cleanup();
    process.exit(1);
  }

  cleanup();
  console.log('\n===============================================================');
  console.log('ALL PHASE 8 ACCEPTANCE & REGRESSION TESTS PASSED (100% GREEN)');
  console.log('===============================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Orchestrator error:', err);
  process.exit(1);
});
