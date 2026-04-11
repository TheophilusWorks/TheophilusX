import { TXIContext } from "../context/TXContext.js";

export default class TXCooldownManager {
  private cooldowns: Map<string, number> = new Map();

  constructor() {}

  public static getCooldownKey(
    keyName: string,
    ctx: TXIContext,
    includeServerId = true,
  ): string {
    let platform = ctx.platform;
    let userId = ctx.author.id;
    let serverId = includeServerId ? ctx.serverId : "0";

    return `${keyName}-${platform}-${userId}-${serverId}`;
  }

  public setCooldown(key: string, duration: number) {
    let cd = Date.now() + duration;
    this.cooldowns.set(key, cd);
    // avoid leaks
    setTimeout(() => {
      this.cooldowns.delete(key);
    }, cd);
  }

  public getRemainingCooldown(key: string): number {
    let cd = this.cooldowns.get(key);
    if (!cd) return 0;

    let remaining = cd - Date.now();

    if (remaining <= 0) {
      this.cooldowns.delete(key);
      return 0;
    }

    return remaining;
  }
}
