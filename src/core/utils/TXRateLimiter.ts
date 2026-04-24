export interface TXRateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  cleanupIntervalMs?: number;
}

export default class TXRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private store: Map<string, number[]>;
  private cleanupTimer: NodeJS.Timeout;

  constructor(options: TXRateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.maxRequests = options.maxRequests ?? 5;
    this.store = new Map();

    this.cleanupTimer = setInterval(
      () => this._cleanup(),
      options.cleanupIntervalMs ?? 5 * 60_000,
    );
    this.cleanupTimer.unref();
  }

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const timestamps = this.store.get(userId) ?? [];
    const recent = timestamps.filter((t) => now - t < this.windowMs);

    if (recent.length >= this.maxRequests) {
      this.store.set(userId, recent);
      return false;
    }

    recent.push(now);
    this.store.set(userId, recent);
    return true;
  }

  consume(userId: string, tokens = 1): boolean {
    for (let i = 0; i < tokens; i++) {
      if (!this.isAllowed(userId)) return false;
    }
    return true;
  }

  destroy() {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }

  private _cleanup() {
    const now = Date.now();
    for (const [id, timestamps] of this.store) {
      const recent = timestamps.filter((t) => now - t < this.windowMs);
      if (recent.length === 0) this.store.delete(id);
      else this.store.set(id, recent);
    }
  }
}
