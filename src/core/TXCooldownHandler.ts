import { TXPlatform } from "./TXPlatform";

export interface TXCooldownContext {
  platform: TXPlatform;
  serverId: string;
  userId: string;
  commandNameOnCooldown: string;
  cooldown: number;
  expiresAt: number;
}

export interface TXCooldownKey {
  platform: TXPlatform;
  serverId: string;
  userId: string;
  commandNameOnCooldown: string;
}

export default class TXCooldownHandler extends Map<string, TXCooldownContext> {
  constructor() {
    super();
  }

  public addCooldown(context: TXCooldownContext) {
    let key = this.getCooldownKey(context);
    this.set(key, context);
  }

  public deleteCooldown(key: string) {
    this.delete(key);
  }

  public getCooldownKey({
    platform,
    commandNameOnCooldown,
    serverId,
    userId,
  }: TXCooldownKey) {
    return `${platform}-${commandNameOnCooldown}-${serverId}-${userId}`;
  }

  public cooldownExpired(key: string): boolean {
    let data = this.get(key);
    if (!data) return true;

    return data.expiresAt < Date.now();
  }
}
