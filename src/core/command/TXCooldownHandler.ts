import { TXIContext } from "../context/TXContext.js";

export default class TXCooldownManager {
  private cooldowns: Map<string, number> = new Map();

  constructor() {}

  public static getCooldownKey(cmdName: string, ctx: TXIContext): string {
    let platform = ctx.platform;
    let userId = ctx.author.id;
    let channelId = ctx.channelId || "0";
    let serverId = ctx.serverId || "0";

    return `${cmdName}-${platform}-${userId}-${channelId}-${serverId}`;
  }

  public setCooldown(key: string, duration: number) {
    this.cooldowns.set(key, Date.now() + duration);
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
