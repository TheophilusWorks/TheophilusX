interface TXCache<V> {
  data: V;
  expiresAt: number;
}

export default class SlidingCache<V> {
  private cacheMap: Map<string, TXCache<V>> = new Map();
  private inFlight: Map<string, Promise<V>> = new Map();
  private ttlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  /**
   * Core: get existing OR initialize once (per key)
   */
  public async getOrInit(key: string, initFn: () => Promise<V>): Promise<V> {
    const cached = this.cacheMap.get(key);

    if (cached && !this.isExpired(cached.expiresAt)) {
      // sliding refresh
      cached.expiresAt = Date.now() + this.ttlMs;
      return cached.data;
    }

    // single-flight protection
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const promise = initFn()
      .then((data) => {
        this.store(key, data);
        return data;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Direct get (no fetch)
   */
  public get(key: string): V | null {
    const cached = this.cacheMap.get(key);
    if (!cached) return null;

    if (this.isExpired(cached.expiresAt)) {
      this.cacheMap.delete(key);
      return null;
    }

    // sliding refresh on access
    cached.expiresAt = Date.now() + this.ttlMs;
    return cached.data;
  }

  /**
   * Force set (overwrite)
   */
  public set(key: string, value: V): void {
    this.store(key, value);
  }

  /**
   * Internal store
   */
  private store(key: string, data: V): void {
    this.cacheMap.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Cleanup expired entries
   */
  public scheduleCleanup(intervalMs: number = 60_000): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [key, value] of this.cacheMap.entries()) {
        if (value.expiresAt <= now) {
          this.cacheMap.delete(key);
        }
      }
    }, intervalMs);
  }

  /**
   * Utility: check expiry
   */
  private isExpired(expiresAt: number): boolean {
    return Date.now() >= expiresAt;
  }

  /**
   * Optional: manual clear
   */
  public clear(): void {
    this.cacheMap.clear();
    this.inFlight.clear();
  }
}
