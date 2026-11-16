/**
 * API Test Helpers
 * 
 * Utilities for testing API endpoints
 */

/**
 * Check if API server is running
 */
export async function isApiServerRunning(baseUrl: string = 'http://localhost:3000'): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Skip test if API server is not running
 */
export async function skipIfApiNotRunning(testFn: () => void | Promise<void>): Promise<void> {
  const isRunning = await isApiServerRunning();
  
  if (!isRunning) {
    console.warn('⚠️ API server not running - skipping test');
    return;
  }
  
  await testFn();
}

/**
 * Generate unique test ID for avoiding conflicts
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
