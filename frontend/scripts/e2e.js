// Orchestrates the fully containerised e2e suite:
//   docker compose up (reuse cached image) → health check → playwright → docker compose down
// Run via: npm run test:e2e
'use strict';

const { spawnSync } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND = path.join(ROOT, 'frontend');
const HEALTH_URL = 'http://localhost:8000/api/health';
const HEALTH_TIMEOUT_MS = 120_000;
const OLLAMA_WARMUP_TIMEOUT_MS = 120_000;

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: ROOT, ...opts });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function tryRun(cmd) {
  spawnSync(cmd, { shell: true, stdio: 'ignore', cwd: ROOT });
}

function waitForUrl(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    process.stdout.write('Waiting for container');

    const attempt = () => {
      http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          process.stdout.write(' Ready.\n');
          return resolve();
        }
        retry();
      }).on('error', retry);
    };

    const retry = () => {
      if (Date.now() > deadline) return reject(new Error(`Timed out waiting for ${url}`));
      process.stdout.write('.');
      setTimeout(attempt, 1000);
    };

    attempt();
  });
}

async function main() {
  let exitCode = 0;

  try {
    console.log('\n=== Resetting DB volume (preserving ollama-data) ===');
    run('docker compose down');
    tryRun('docker volume rm kanban_kanban-data');

    console.log('\n=== Starting containers (using cached image) ===');
    run('docker compose up -d');

    console.log('\n=== Pulling Ollama model (skipped if cached in volume) ===');
    run('docker compose exec ollama ollama pull llama3.2');

    console.log('\n=== Warming up Ollama model ===');
    spawnSync('docker compose exec ollama ollama run llama3.2 "hi"', {
      shell: true,
      cwd: ROOT,
      stdio: 'ignore',
      timeout: OLLAMA_WARMUP_TIMEOUT_MS,
    });

    console.log('\n=== Waiting for app to be healthy ===');
    await waitForUrl(HEALTH_URL, HEALTH_TIMEOUT_MS);

    console.log('\n=== Running Playwright e2e tests ===');
    const result = spawnSync('npx playwright test', {
      shell: true,
      stdio: 'inherit',
      cwd: FRONTEND,
      env: { ...process.env, BASE_URL: 'http://localhost:8000' },
    });
    exitCode = result.status ?? 1;

  } finally {
    console.log('\n=== Tearing down containers ===');
    tryRun('docker compose down');
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
