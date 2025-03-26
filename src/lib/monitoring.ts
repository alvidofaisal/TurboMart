/**
 * Monitoring and Analytics for TurboMart
 * 
 * This module integrates with various monitoring tools to track
 * performance metrics, errors, and usage statistics.
 */

// Constants for metrics
const METRICS_ENDPOINT = process.env.METRICS_ENDPOINT || '';

// Performance measurement
interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp?: number;
  tags?: Record<string, string>;
}

// Request tracking
interface RequestInfo {
  path: string;
  method: string;
  startTime: number;
  endTime?: number;
  statusCode?: number;
  error?: Error;
  userAgent?: string;
  referer?: string;
  ipAddress?: string;
}

// Initialize active requests tracking
const activeRequests: Map<string, RequestInfo> = new Map();

/**
 * Record a performance metric
 */
export async function recordMetric(metric: PerformanceMetric): Promise<void> {
  // Add timestamp if not provided
  if (!metric.timestamp) {
    metric.timestamp = Date.now();
  }

  // In a Cloudflare Workers environment
  if (typeof TURBOMART_CACHE !== 'undefined') {
    // Store metric in KV for later batch processing
    const metricKey = `metric:${metric.name}:${metric.timestamp}`;
    await TURBOMART_CACHE.put(metricKey, JSON.stringify(metric), { expirationTtl: 86400 });
    return;
  }

  // In a browser or Node.js environment
  if (METRICS_ENDPOINT) {
    try {
      await fetch(METRICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
        // Use keepalive to ensure the request completes even if the page unloads
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send metric:', error);
    }
  }

  // Always log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Metric] ${metric.name}: ${metric.value}${metric.unit}`);
  }
}

/**
 * Start tracking a request
 */
export function startRequest(req: Request): string {
  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  
  activeRequests.set(requestId, {
    path: url.pathname,
    method: req.method,
    startTime: performance.now(),
    userAgent: req.headers.get('user-agent') || undefined,
    referer: req.headers.get('referer') || undefined,
    ipAddress: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || undefined,
  });
  
  return requestId;
}

/**
 * End tracking a request
 */
export function endRequest(requestId: string, statusCode: number, error?: Error): void {
  const request = activeRequests.get(requestId);
  if (!request) {
    return;
  }
  
  request.endTime = performance.now();
  request.statusCode = statusCode;
  request.error = error;
  
  // Record request duration metric
  const duration = request.endTime - request.startTime;
  recordMetric({
    name: 'request_duration',
    value: duration,
    unit: 'ms',
    tags: {
      path: request.path,
      method: request.method,
      status: statusCode.toString(),
      error: error ? 'true' : 'false',
    },
  });
  
  // Record request count
  recordMetric({
    name: 'request_count',
    value: 1,
    unit: 'count',
    tags: {
      path: request.path,
      method: request.method,
      status: statusCode.toString(),
    },
  });
  
  // Clean up
  activeRequests.delete(requestId);
  
  // Log errors
  if (error) {
    console.error(`[Request ${requestId}] Error processing ${request.method} ${request.path}:`, error);
  }
}

/**
 * Measure database query performance
 */
export async function measureDatabaseQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    
    recordMetric({
      name: 'db_query_duration',
      value: duration,
      unit: 'ms',
      tags: {
        query_name: name,
      },
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    recordMetric({
      name: 'db_query_duration',
      value: duration,
      unit: 'ms',
      tags: {
        query_name: name,
        error: 'true',
      },
    });
    
    // Re-throw the error
    throw error;
  }
}

/**
 * Track client-side page navigation
 */
export function trackPageView(path: string, loadTime: number): void {
  recordMetric({
    name: 'page_load_time',
    value: loadTime,
    unit: 'ms',
    tags: {
      path,
    },
  });
  
  recordMetric({
    name: 'page_view',
    value: 1,
    unit: 'count',
    tags: {
      path,
    },
  });
  
  // If Plausible is configured, send analytics
  const plausibleDomain = process.env.PLAUSIBLE_DOMAIN;
  if (plausibleDomain && typeof window !== 'undefined') {
    const plausibleScript = document.createElement('script');
    plausibleScript.defer = true;
    plausibleScript.setAttribute('data-domain', plausibleDomain);
    plausibleScript.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(plausibleScript);
  }
}

// Export types for use in other files
export type { PerformanceMetric, RequestInfo }; 