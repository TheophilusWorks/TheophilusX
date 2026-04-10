import { TXICache } from "./TXICache.js";
import fs from "fs/promises";

export default class TXCacheManager {
  private config: TXICache;

  constructor(config: TXICache) {
    this.config = config;
  }

  public set<K extends keyof Omit<TXICache, "cachePath">>(
    key: K,
    value: TXICache[K],
  ) {
    this.config[key] = value;
  }

  public get<K extends keyof Omit<TXICache, "cachePath">>(key: K): TXICache[K] {
    return this.config[key];
  }

  public save() {
    const { cachePath, ...contents } = this.config;
    this.makeCacheFile(contents);
  }

  public async load() {
    try {
      const raw = await fs.readFile(this.config.cachePath, "utf8");
      const parsed = JSON.parse(raw);

      if (parsed.updateSchedule)
        parsed.updateSchedule = new Date(parsed.updateSchedule);

      this.config = { ...this.config, ...parsed };
    } catch {
      // no cache file yet, start fresh
    }
  }

  private async makeCacheFile(contents: Record<string, any> = {}) {
    await fs.writeFile(
      this.config.cachePath,
      JSON.stringify(contents, null, 2),
      "utf8",
    );
  }
}
