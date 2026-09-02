/**
 * Node.js Service Orchestrator & Final Acceptance Runner
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
    execSync(`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' });
  } catch {}
}

async function main() {
  console.log('=== Cleaning ports 3000, 5173, 8000 ===');
  cleanPort(3000);
  cleanPort(5173);
  cleanPort(8000);
  await sleep(1000);

  const pythonExe = 'D:\\Movies and Web se\\hackerthon\\ai-engine\\.venv\\Scripts\\python.exe';
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

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
  console.log('Waiting for all services to report healthy...');

  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const [bOk, aOk, fOk] = await Promise.all([
      checkHttp('http://localhost:3000/api/health'),
      checkHttp('http://localhost:8000/health'),
      checkHttp('http://localhost:5173'),
    ]);

    if (bOk && aOk && fOk) {
      allReady = true;
      console.log(`\n>>> All services ready in ${i + 1}s! (Backend: 3000, AI: 8000, Frontend: 5173)\n`);
      break;
    }
    process.stdout.write(`  [${i + 1}s] Backend: ${bOk ? 'OK' : 'waiting'}, AI: ${aOk ? 'OK' : 'waiting'}, Frontend: ${fOk ? 'OK' : 'waiting'}\r`);
  }

  let testExitCode = 0;
  if (allReady) {
    try {
      console.log('Launching verify-phase5-final-acceptance.js...\n');
      execSync('node scripts/verify-phase5-final-acceptance.js', {
        stdio: 'inherit',
        env: process.env,
      });
    } catch (err) {
      testExitCode = err.status || 1;
    }
  } else {
    console.error('\nERROR: Services timed out waiting for health checks.');
    testExitCode = 1;
  }

  console.log('\n=== Shutting down background test services ===');
  try { aiProc.kill(); } catch {}
  try { backendProc.kill(); } catch {}
  try { frontendProc.kill(); } catch {}
  cleanPort(3000);
  cleanPort(5173);
  cleanPort(8000);

  process.exit(testExitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
