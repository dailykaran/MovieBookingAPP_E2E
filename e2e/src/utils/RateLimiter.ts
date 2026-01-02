/**
 * RateLimiter Utility Class
 * Implements token bucket rate limiting for API calls
 */

import { RateLimitConfig } from '../types/index.js';

export class RateLimiter {
  private callTimes: number[] = [];
  private maxCalls: number;
  private windowMs: number;

  /**
   * Initialize rate limiter
   * @param maxCalls - Maximum calls allowed per window
   * @param windowMs - Time window in milliseconds
   */
  constructor(config: RateLimitConfig) {
    this.maxCalls = config.maxCalls;
    this.windowMs = config.windowMs;
  }

  /**
   * Wait if rate limit reached, then allow call
   */
  async wait(): Promise<void> {
    const now = Date.now();

    // Remove old calls outside the window
    this.callTimes = this.callTimes.filter(time => now - time < this.windowMs);

    // If at limit, wait
    if (this.callTimes.length >= this.maxCalls) {
      const oldestCall = this.callTimes[0];
      const waitTime = this.windowMs - (now - oldestCall) + 100;
      console.log(`⏳ Rate limit: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.wait(); // Recursive retry
    }

    // Record this call
    this.callTimes.push(now);
  }

  /**
   * Get current call count in window
   */
  getCurrentCount(): number {
    const now = Date.now();
    this.callTimes = this.callTimes.filter(time => now - time < this.windowMs);
    return this.callTimes.length;
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.callTimes = [];
  }
}
