import http from 'http';
import https from 'https';

// ---------- Configuration ----------
const BASE_URL = process.env.TEST_URL || 'https://www.edureach.site';
const LOAD_TEST_SECRET = process.env.LOAD_TEST_SECRET || 'proctorai_load_test_secret_2026';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '20', 10);
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS || '5', 10);

console.log(`\n==================================================`);
console.log(`🚀 PROCTORAI HIGH-CONCURRENCY LOAD TEST`);
console.log(`==================================================`);
console.log(`Target Host:       ${BASE_URL}`);
console.log(`Simulated Users:   ${CONCURRENT_USERS} concurrent requests`);
console.log(`Test Duration:     ${DURATION_SECONDS} seconds`);
console.log(`Auth Secret:       ${LOAD_TEST_SECRET ? '✓ Set' : '✗ Missing'}`);
console.log(`==================================================\n`);

async function makeRequest(urlStr, method = 'GET', body = null, customHeaders = {}) {
  const start = Date.now();
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const payload = body ? JSON.stringify(body) : undefined;
      const headers = {
        'x-load-test-secret': LOAD_TEST_SECRET,
        'x-mock-user-id': `simulated_user_${Math.floor(Math.random() * 1000)}`,
        'User-Agent': 'ProctorAI-LoadTester/1.0',
        ...customHeaders,
      };

      if (payload) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload).toString();
      }

      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers,
          timeout: 10000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            const durationMs = Date.now() - start;
            resolve({ statusCode: res.statusCode || 0, durationMs });
          });
        }
      );

      req.on('error', (err) => {
        resolve({ statusCode: 0, durationMs: Date.now() - start, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ statusCode: 408, durationMs: Date.now() - start, error: 'Request Timeout' });
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    } catch (e) {
      resolve({ statusCode: 0, durationMs: Date.now() - start, error: e.message });
    }
  });
}

function printStats(name, results) {
  const total = results.length;
  if (total === 0) {
    console.log(`\n📊 ${name}: No requests completed.`);
    return;
  }

  const successCount = results.filter((r) => r.statusCode >= 200 && r.statusCode < 400).length;
  const throttledCount = results.filter((r) => r.statusCode === 429).length;
  const failCount = total - successCount - throttledCount;

  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const avg = latencies.reduce((sum, l) => sum + l, 0) / total;
  const p95 = latencies[Math.floor(total * 0.95)] || max;
  const p99 = latencies[Math.floor(total * 0.99)] || max;

  console.log(`\n📊 SCENARIO RESULT: ${name}`);
  console.log(`--------------------------------------------------`);
  console.log(`Total Requests:    ${total}`);
  console.log(`Successful (2xx):  ${successCount} (${Math.round((successCount / total) * 100)}%)`);
  console.log(`Throttled (429):   ${throttledCount} (${Math.round((throttledCount / total) * 100)}%)`);
  console.log(`Failed (5xx/0):    ${failCount}`);
  console.log(`Min Latency:       ${min} ms`);
  console.log(`Avg Latency:       ${Math.round(avg)} ms`);
  console.log(`P95 Latency:       ${p95} ms`);
  console.log(`P99 Latency:       ${p99} ms`);
  console.log(`Max Latency:       ${max} ms`);
  console.log(`--------------------------------------------------`);
}

async function runScenario1_LiveMonitorPolling() {
  console.log(`\n⚡ Scenario 1: Live Contest Monitor Polling (${CONCURRENT_USERS} users polling /live-status)...`);
  const results = [];
  const endTime = Date.now() + DURATION_SECONDS * 1000;

  async function worker() {
    while (Date.now() < endTime) {
      const res = await makeRequest(`${BASE_URL}/api/exams/1/live-status`, 'GET');
      results.push(res);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const workers = Array.from({ length: CONCURRENT_USERS }).map(() => worker());
  await Promise.all(workers);
  printStats('1. Live Monitor Polling', results);
}

async function runScenario2_FlagIngestion() {
  console.log(`\n⚡ Scenario 2: Concurrent Proctoring Flag Ingestion (${CONCURRENT_USERS} users reporting webcam flags)...`);
  const results = [];
  const endTime = Date.now() + DURATION_SECONDS * 1000;
  const flagTypes = ['tab_switch', 'looking_away', 'phone_detected', 'face_not_visible', 'multiple_faces'];

  async function worker(userIdx) {
    while (Date.now() < endTime) {
      const randomFlag = flagTypes[Math.floor(Math.random() * flagTypes.length)];
      const res = await makeRequest(
        `${BASE_URL}/api/sessions/1/flags`,
        'POST',
        {
          type: randomFlag,
          description: `Simulated load test flag detection from virtual user #${userIdx}`,
          detectedAt: new Date().toISOString(),
        },
        { 'x-mock-user-id': `virtual_student_${userIdx}` }
      );
      results.push(res);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const workers = Array.from({ length: CONCURRENT_USERS }).map((_, idx) => worker(idx));
  await Promise.all(workers);
  printStats('2. Proctoring Flag Ingestion', results);
}

async function main() {
  await runScenario1_LiveMonitorPolling();
  await runScenario2_FlagIngestion();

  console.log(`\n✅ Load test suite completed successfully.`);
}

main().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
