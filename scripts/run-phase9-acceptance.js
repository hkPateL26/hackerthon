/**
 * PHASE 9 — UNIFIED ACCEPTANCE & REGRESSION ORCHESTRATOR
 *
 * Runs:
 * 1. Phase 9 ANPR End-to-End Live Verification (scripts/verify-phase9-anpr.js)
 * 2. Phase 8 Tracking Regression (scripts/verify-phase8-tracking.js)
 * 3. Phase 7 Analytics Regression (scripts/verify-phase7-analytics.js)
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => resolve(res.statusCode < 500)).on('error', () => resolve(false));
  });
}

async function ensureServicesRunning() {
  console.log('Checking service health...');

  let backendUp = await checkUrl('http://localhost:3000/api/health');
  let aiUp = await checkUrl('http://localhost:8000/health');
  let frontendUp = await checkUrl('http://localhost:5173');

  if (!backendUp) {
    console.log('Starting Backend service...');
    const backendProcess = spawn('npm', ['run', 'start:dev'], {
      cwd: path.resolve(__dirname, '..', 'backend'),
      shell: true,
      stdio: 'ignore',
      detached: true,
    });
    backendProcess.unref();
  }

  if (!aiUp) {
    console.log('Starting AI Engine service...');
    const aiProcess = spawn('cmd.exe', ['/c', '.venv\\Scripts\\python.exe', '-m', 'uvicorn', 'src.main:app', '--host', '0.0.0.0', '--port', '8000'], {
      cwd: path.resolve(__dirname, '..', 'ai-engine'),
      shell: true,
      stdio: 'ignore',
      detached: true,
    });
    aiProcess.unref();
  }

  if (!frontendUp) {
    console.log('Starting Frontend service...');
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '..', 'frontend'),
      shell: true,
      stdio: 'ignore',
      detached: true,
    });
    frontendProcess.unref();
  }

  // Poll until healthy
  for (let i = 0; i < 20; i++) {
    backendUp = await checkUrl('http://localhost:3000/api/health');
    aiUp = await checkUrl('http://localhost:8000/health');
    if (backendUp && aiUp) break;
    await sleep(2000);
  }

  console.log(`Services status: Backend=${backendUp}, AI Engine=${aiUp}`);
}

async function main() {
  await ensureServicesRunning();

  console.log('\n===============================================================');
  console.log('  RUNNING PHASE 9 ANPR ACCEPTANCE & FULL REGRESSION SUITE');
  console.log('===============================================================\n');

  try {
    console.log('>>> [1/3] Running Phase 9 ANPR Live Acceptance Suite...');
    execSync('node scripts/verify-phase9-anpr.js', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log('✓ Phase 9 ANPR Live Acceptance: PASSED\n');

    console.log('>>> [2/3] Running Phase 8 Tracking Regression Suite...');
    execSync('node scripts/verify-phase8-tracking.js', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log('✓ Phase 8 Tracking Regression: PASSED\n');

    console.log('>>> [3/3] Running Phase 7 Analytics Regression Suite...');
    execSync('node scripts/verify-phase7-analytics.js', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log('✓ Phase 7 Analytics Regression: PASSED\n');

    console.log('===============================================================');
    console.log('  ALL PHASE 7, 8, AND 9 SUITES 100% GREEN!');
    console.log('===============================================================');
    process.exit(0);
  } catch (err) {
    console.error('\nAcceptance run failed:', err.message);
    process.exit(1);
  }
}

main();
