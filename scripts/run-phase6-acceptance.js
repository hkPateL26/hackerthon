/**
 * Phase 6 Orchestrator & Live Verification Runner
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
    execSync('powershell -NoProfile -Command "Stop-Process -Name ffmpeg -Force -ErrorAction SilentlyContinue"', {
      stdio: 'ignore',
    });
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
  const aiProc = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--port', '8000', '--host', '127.0.0.1'], {
    cwd: path.resolve('ai-engine'),
    stdio: 'ignore',
  });

  console.log('Starting Backend (NestJS :3000)...');
  const backendProc = spawn('node', ['dist/main.js'], {
    cwd: path.resolve('backend'),
    stdio: 'ignore',
  });

  console.log('Starting Frontend Preview (:5173)...');
  const viteBin = path.resolve('frontend', 'node_modules', 'vite', 'bin', 'vite.js');
  const frontendProc = spawn('node', [viteBin, 'preview', '--port', '5173'], {
    cwd: path.resolve('frontend'),
    stdio: 'ignore',
  });

  let allReady = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const aiOk = await checkHttp('http://localhost:8000/health');
    const backendOk = await checkHttp('http://localhost:3000/api/health');
    const frontendOk = await checkHttp('http://localhost:5173/');
    if (aiOk && backendOk && frontendOk) {
      allReady = true;
      console.log(`All services online and healthy after ${i + 1}s!`);
      break;
    }
  }

  if (!allReady) {
    console.error('Timeout waiting for services to be ready.');
    aiProc.kill();
    backendProc.kill();
    frontendProc.kill();
    process.exit(1);
  }

  console.log('\n--- Running Phase 6 Acceptance Verification Suite ---');
  let exitCode = 0;
  try {
    execSync('node scripts/verify-phase6-monitoring.js', { stdio: 'inherit' });
  } catch (err) {
    exitCode = err.status || 1;
  } finally {
    console.log('\n--- Teardown Services ---');
    killFfmpeg();
    aiProc.kill();
    backendProc.kill();
    frontendProc.kill();
    cleanPort(3000);
    cleanPort(5173);
    cleanPort(8000);
    console.log('Teardown complete. Exit code:', exitCode);
    process.exit(exitCode);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
