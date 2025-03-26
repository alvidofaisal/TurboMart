#!/usr/bin/env node

/**
 * Load Testing Script for TurboMart
 * 
 * This script runs load tests to verify that the application can handle
 * the required amount of traffic while maintaining performance targets.
 * 
 * Usage:
 *   node scripts/load-test.js [--target=<url>] [--duration=<seconds>] [--users=<count>]
 * 
 * Options:
 *   --target=<url>        Target URL to test (default: "https://turbomart.com")
 *   --duration=<seconds>  Test duration in seconds (default: 60)
 *   --users=<count>       Concurrent users (default: 20)
 *   --verbose             Enable verbose output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Parse command-line arguments
const args = process.argv.slice(2);
const targetUrl = args.find(arg => arg.startsWith('--target='))?.split('=')[1] || 'http://localhost:3000';
const duration = parseInt(args.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '60', 10);
const userCount = parseInt(args.find(arg => arg.startsWith('--users='))?.split('=')[1] || '20', 10);
const verbose = args.includes('--verbose');

// Check if k6 is installed
function checkK6() {
  try {
    execSync('k6 --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Main function to run the load test
async function runLoadTest() {
  console.log('TurboMart Load Testing Tool');
  console.log(`Target: ${targetUrl}`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`Concurrent Users: ${userCount}`);
  
  // Check if k6 is available
  if (checkK6()) {
    await runK6Test();
  } else {
    console.log('k6 not found, using built-in load testing...');
    await runBuiltInTest();
  }
}

// Run a test using k6 if available
async function runK6Test() {
  const scriptPath = path.join(__dirname, 'k6-script.js');
  
  // Create the k6 test script
  const k6Script = `
    import http from 'k6/http';
    import { check, sleep } from 'k6';
    
    export const options = {
      vus: ${userCount},
      duration: '${duration}s',
      thresholds: {
        'http_req_duration': ['p(95)<1500'], // 95% of requests must complete below 1.5s
        'http_req_failed': ['rate<0.01'],   // Less than 1% of requests can fail
      },
    };
    
    export default function () {
      const baseUrl = '${targetUrl}';
      
      // Home page
      let res = http.get(baseUrl);
      check(res, {
        'homepage status is 200': (r) => r.status === 200,
        'homepage has expected content': (r) => r.body.includes('TurboMart'),
        'homepage loads in under 1500ms': (r) => r.timings.duration < 1500,
      });
      
      sleep(Math.random() * 3);
      
      // Product page (assuming a product URL structure)
      res = http.get(`${baseUrl}/products/sample-product`);
      check(res, {
        'product page status is 200': (r) => r.status === 200,
        'product page loads in under 1500ms': (r) => r.timings.duration < 1500,
      });
      
      sleep(Math.random() * 2);
      
      // Search request
      res = http.get(`${baseUrl}/api/search?q=test`);
      check(res, {
        'search API status is 200': (r) => r.status === 200,
        'search API responds in under 150ms': (r) => r.timings.duration < 150,
      });
      
      sleep(Math.random() * 5);
    }
  `;
  
  fs.writeFileSync(scriptPath, k6Script);
  
  // Run k6
  try {
    console.log('Starting k6 load test...');
    execSync(`k6 run ${scriptPath}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error running k6 test:', error);
  } finally {
    // Clean up the script file
    fs.unlinkSync(scriptPath);
  }
}

// Built-in load testing implementation using worker threads
async function runBuiltInTest() {
  if (!isMainThread) {
    // Worker code
    runWorker();
    return;
  }
  
  // Performance metrics
  const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimeTotal: 0,
    responseTimeCounts: 0,
    responseTimeMax: 0,
    responseTimeMin: Number.MAX_SAFE_INTEGER,
    responseTimes: [],
    startTime: Date.now(),
    endTime: 0,
  };
  
  // Prepare workers
  const workerCount = Math.min(os.cpus().length - 1, 4); // Use at most 4 cores or available cores - 1
  console.log(`Using ${workerCount} workers`);
  
  const workerParams = {
    targetUrl,
    duration,
    requestsPerWorker: Math.ceil((userCount * duration) / workerCount),
    verbose,
  };
  
  const workers = [];
  
  // Setup workers
  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(__filename, { workerData: workerParams });
    
    worker.on('message', (data) => {
      // Aggregate metrics from workers
      metrics.totalRequests += data.totalRequests;
      metrics.successfulRequests += data.successfulRequests;
      metrics.failedRequests += data.failedRequests;
      metrics.responseTimeTotal += data.responseTimeTotal;
      metrics.responseTimeCounts += data.responseTimeCounts;
      metrics.responseTimeMax = Math.max(metrics.responseTimeMax, data.responseTimeMax);
      metrics.responseTimeMin = Math.min(metrics.responseTimeMin, data.responseTimeMin);
      metrics.responseTimes = metrics.responseTimes.concat(data.responseTimes);
      
      if (verbose) {
        console.log(`Worker ${i + 1} progress: ${data.totalRequests} requests`);
      }
    });
    
    worker.on('error', (err) => {
      console.error(`Worker ${i + 1} error:`, err);
    });
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker ${i + 1} exited with code ${code}`);
      }
      
      // Check if all workers have completed
      if (workers.every(w => w.threadId && !w.isRunning())) {
        metrics.endTime = Date.now();
        reportResults(metrics);
      }
    });
    
    workers.push(worker);
  }
  
  // Setup logging during the test
  const statusInterval = setInterval(() => {
    const elapsedSeconds = (Date.now() - metrics.startTime) / 1000;
    const rps = metrics.totalRequests / elapsedSeconds;
    console.log(`Elapsed: ${elapsedSeconds.toFixed(1)}s, Requests: ${metrics.totalRequests}, Rate: ${rps.toFixed(2)} req/sec`);
  }, 5000);
  
  // Stop the interval when done
  setTimeout(() => {
    clearInterval(statusInterval);
  }, duration * 1000 + 5000);
}

// Worker function for built-in load testing
function runWorker() {
  const { targetUrl, requestsPerWorker, verbose } = workerData;
  
  // Initialize metrics
  const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimeTotal: 0,
    responseTimeCounts: 0,
    responseTimeMax: 0,
    responseTimeMin: Number.MAX_SAFE_INTEGER,
    responseTimes: [],
  };
  
  // Parse URL to determine HTTP module
  const url = new URL(targetUrl);
  const httpClient = url.protocol === 'https:' ? https : http;
  
  // Configure agent for keep-alive
  const agent = new httpClient.Agent({
    keepAlive: true,
    maxSockets: 50,
  });
  
  // Define endpoints to test
  const endpoints = [
    '/', 
    '/products/sample-product',
    '/api/search?q=test',
    '/categories/electronics',
  ];
  
  // Function to make a single request
  async function makeRequest(path) {
    return new Promise((resolve) => {
      const fullUrl = `${targetUrl}${path}`;
      const startTime = Date.now();
      
      const req = httpClient.get(fullUrl, { agent }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          metrics.totalRequests += 1;
          metrics.responseTimeTotal += responseTime;
          metrics.responseTimeCounts += 1;
          metrics.responseTimeMax = Math.max(metrics.responseTimeMax, responseTime);
          metrics.responseTimeMin = Math.min(metrics.responseTimeMin, responseTime);
          metrics.responseTimes.push(responseTime);
          
          if (res.statusCode >= 200 && res.statusCode < 400) {
            metrics.successfulRequests += 1;
          } else {
            metrics.failedRequests += 1;
            if (verbose) {
              console.error(`Request to ${fullUrl} failed with status ${res.statusCode}`);
            }
          }
          
          // Report progress periodically
          if (metrics.totalRequests % 100 === 0) {
            parentPort.postMessage(metrics);
          }
          
          resolve();
        });
      });
      
      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        metrics.totalRequests += 1;
        metrics.failedRequests += 1;
        metrics.responseTimeTotal += responseTime;
        metrics.responseTimeCounts += 1;
        metrics.responseTimes.push(responseTime);
        
        if (verbose) {
          console.error(`Request to ${fullUrl} failed with error:`, error.message);
        }
        
        resolve();
      });
      
      req.end();
    });
  }
  
  // Run the requests
  async function runRequests() {
    for (let i = 0; i < requestsPerWorker; i++) {
      // Select a random endpoint
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      await makeRequest(endpoint);
      
      // Random sleep between 100-500ms to simulate real users
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    }
    
    // Send final metrics
    parentPort.postMessage(metrics);
    process.exit(0);
  }
  
  // Start the worker
  runRequests().catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
  });
}

// Report the test results
function reportResults(metrics) {
  const totalDuration = (metrics.endTime - metrics.startTime) / 1000;
  const avgResponseTime = metrics.responseTimeTotal / metrics.responseTimeCounts;
  const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  const requestsPerSecond = metrics.totalRequests / totalDuration;
  
  // Calculate percentiles
  metrics.responseTimes.sort((a, b) => a - b);
  const p50 = metrics.responseTimes[Math.floor(metrics.responseTimes.length * 0.5)];
  const p90 = metrics.responseTimes[Math.floor(metrics.responseTimes.length * 0.9)];
  const p95 = metrics.responseTimes[Math.floor(metrics.responseTimes.length * 0.95)];
  const p99 = metrics.responseTimes[Math.floor(metrics.responseTimes.length * 0.99)];
  
  console.log('\n=== Load Test Results ===');
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful Requests: ${metrics.successfulRequests} (${successRate.toFixed(2)}%)`);
  console.log(`Failed Requests: ${metrics.failedRequests}`);
  console.log(`Total Duration: ${totalDuration.toFixed(2)} seconds`);
  console.log(`Requests Per Second: ${requestsPerSecond.toFixed(2)}`);
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)} ms`);
  console.log(`Min Response Time: ${metrics.responseTimeMin} ms`);
  console.log(`Max Response Time: ${metrics.responseTimeMax} ms`);
  console.log(`P50 Response Time: ${p50} ms`);
  console.log(`P90 Response Time: ${p90} ms`);
  console.log(`P95 Response Time: ${p95} ms`);
  console.log(`P99 Response Time: ${p99} ms`);
  
  // Check against performance targets
  console.log('\n=== Performance Targets ===');
  const ttfbTarget = p95 < 100;
  const loadTimeTarget = p95 < 1500;
  
  console.log(`TTFB under 100ms: ${ttfbTarget ? '✅ PASS' : '❌ FAIL'} (P95: ${p95} ms)`);
  console.log(`Load time under 1.5s: ${loadTimeTarget ? '✅ PASS' : '❌ FAIL'} (P95: ${p95} ms)`);
  console.log(`Success rate above 99%: ${successRate > 99 ? '✅ PASS' : '❌ FAIL'} (${successRate.toFixed(2)}%)`);
  
  // Summary
  if (ttfbTarget && loadTimeTarget && successRate > 99) {
    console.log('\n✅ All performance targets met!');
  } else {
    console.log('\n❌ Some performance targets were not met.');
  }
}

// Run the main function if this is the main thread
if (isMainThread) {
  runLoadTest().catch(error => {
    console.error('Error running load test:', error);
    process.exit(1);
  });
}

// If this script is imported as a module in k6, export the default function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runLoadTest };
} 