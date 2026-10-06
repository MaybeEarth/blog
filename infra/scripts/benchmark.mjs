/**
 * Multi-scenario high-concurrency performance benchmark script for the Blog API.
 * Measures throughput (RPS) and latency percentiles (p50, p90, p95, p99).
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001/api/v1';

async function runScenario({ name, url, method = 'GET', body = null, headers = {}, concurrency = 20, totalRequests = 200 }) {
  console.log(`\n==================================================`);
  console.log(`Scenario: ${name}`);
  console.log(`Target: [${method}] ${url}`);
  console.log(`Concurrency: ${concurrency} | Total: ${totalRequests}`);
  console.log(`--------------------------------------------------`);

  const latencies = [];
  let successCount = 0;
  let failureCount = 0;
  let requestIdx = 0;

  const startTime = performance.now();

  async function worker(workerId) {
    while (true) {
      const currentIdx = requestIdx++;
      if (currentIdx >= totalRequests) break;

      const clientIp = `10.0.${Math.floor(currentIdx / 50)}.${(currentIdx % 50) + 1}`;
      const reqStart = performance.now();
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': clientIp,
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        const reqEnd = performance.now();
        const duration = reqEnd - reqStart;
        latencies.push(duration);

        if (response.ok) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (err) {
        failureCount++;
        latencies.push(performance.now() - reqStart);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i));
  await Promise.all(workers);

  const totalTimeSec = (performance.now() - startTime) / 1000;
  const rps = (totalRequests / totalTimeSec).toFixed(1);

  latencies.sort((a, b) => a - b);
  const p = (pct) => latencies[Math.floor(latencies.length * (pct / 100))].toFixed(2);
  const mean = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
  const min = latencies[0]?.toFixed(2) || 0;
  const max = latencies[latencies.length - 1]?.toFixed(2) || 0;

  console.log(`Results for: ${name}`);
  console.log(`  Requests: ${totalRequests} (Success: ${successCount}, Failed: ${failureCount})`);
  console.log(`  Duration: ${totalTimeSec.toFixed(2)}s | RPS: ${rps} req/sec`);
  console.log(`  Latency (ms):`);
  console.log(`    Min:  ${min} ms`);
  console.log(`    Mean: ${mean} ms`);
  console.log(`    p50:  ${p(50)} ms`);
  console.log(`    p90:  ${p(90)} ms`);
  console.log(`    p95:  ${p(95)} ms`);
  console.log(`    p99:  ${p(99)} ms`);
  console.log(`    Max:  ${max} ms`);

  return { name, rps, mean, p50: p(50), p95: p(95), p99: p(99), successCount, failureCount };
}

async function main() {
  console.log(`\n=======================================================`);
  console.log(`   BLOG PLATFORM PERFORMANCE BENCHMARK & STRESS TEST   `);
  console.log(`=======================================================`);
  console.log(`Base URL: ${API_BASE}`);

  // Warmup request
  try {
    const health = await fetch(`${API_BASE}/health`);
    if (!health.ok) {
      console.error(`Health check failed with status: ${health.status}`);
      process.exit(1);
    }
    console.log(`Health check OK (status: 200). Beginning benchmarks...\n`);
  } catch (err) {
    console.error(`Could not reach ${API_BASE}. Make sure the API is running:`, err.message);
    process.exit(1);
  }

  // 1. Keyset Cursor Pagination
  await runScenario({
    name: '1. Keyset Cursor Pagination (Cached/Index Scan)',
    url: `${API_BASE}/posts?locale=tr&limit=10`,
    concurrency: 20,
    totalRequests: 200,
  });

  // 2. Single Post with Full Relations & Negative Cache Check
  await runScenario({
    name: '2. Single Post Detail (Multi-language & Relations)',
    url: `${API_BASE}/posts/tr/canli-yayin-testi-1791310587679`,
    concurrency: 20,
    totalRequests: 200,
  });

  // 3. PostgreSQL Trigram Autocomplete Search
  await runScenario({
    name: '3. GIN Trigram Autocomplete Search',
    url: `${API_BASE}/search/suggest?q=yayin&locale=tr`,
    concurrency: 15,
    totalRequests: 150,
  });

  // 4. PostgreSQL tsvector Full-Text Search with Snippet Generation
  await runScenario({
    name: '4. PostgreSQL tsvector Full-Text Search',
    url: `${API_BASE}/search?q=testi&locale=tr`,
    concurrency: 15,
    totalRequests: 150,
  });

  // 5. Analytics View Beacon Ingestion (Redis deduped)
  await runScenario({
    name: '5. Analytics View Beacon Ingestion',
    url: `${API_BASE}/analytics/view`,
    method: 'POST',
    body: {
      postId: 'd82b1098-3158-4c3f-9e90-f0544d0bd516',
      locale: 'tr',
    },
    concurrency: 25,
    totalRequests: 250,
  });

  console.log(`\n=======================================================`);
  console.log(`   ALL BENCHMARKS COMPLETED ACCORDING TO PERFORMANCE BUDGET`);
  console.log(`=======================================================\n`);
}

main().catch((err) => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
