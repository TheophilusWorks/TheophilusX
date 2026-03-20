import { TXCooldownContext } from "./TXCooldownHandler";
import TXMessageHandle from "./TXMessageHandle";
import { TXPlatform } from "./TXPlatform";

export interface TXContext {
  platform: TXPlatform;
  userId: string;
  serverId: string;
  channelId: string;
  content: string;
  raw: any;
  isSelf: boolean;
  replySent: boolean;
  reply?: (message: string) => Promise<TXMessageHandle>;
  replyCooldown?: (message: TXCooldownContext) => Promise<void>;
  editMsg?: (message: string) => Promise<void>;
}

export default class TXContextBuilder {
  private context: TXContext;

  constructor(context: TXContext) {
    this.context = context;
  }

  public changePlatform(newPlatform: TXPlatform): this {
    this.context.platform = newPlatform;
    return this;
  }
  public changeUserId(newUserId: string): this {
    this.context.userId = newUserId;
    return this;
  }
  public changeServerId(newServerId: string): this {
    this.context.serverId = newServerId;
    return this;
  }
  public changeChannelId(newChannelId: string): this {
    this.context.channelId = newChannelId;
    return this;
  }
  public changeContent(newContent: string): this {
    this.context.content = newContent;
    return this;
  }
  public changeRaw(newRaw: any): this {
    this.context.raw = newRaw;
    return this;
  }

  // getters for easy access
  get platform() {
    return this.context.platform;
  }

  get isSelf() {
    return this.context.isSelf;
  }

  get userId() {
    return this.context.userId;
  }

  get serverId() {
    return this.context.serverId;
  }

  get channelId() {
    return this.context.channelId;
  }

  get content() {
    return this.context.content;
  }

  get raw() {
    return this.context.raw;
  }

  get replySent() {
    return this.context.replySent;
  }

  // reply function, delegated to adapter
  public async reply(message: string): Promise<TXMessageHandle> {
    if (!this.context.reply) {
      throw new Error("Reply function not attached for this context");
    }
    return await this.context.reply(message);
  }

  public async replyCooldown(message: TXCooldownContext) {
    if (!this.context.replyCooldown) {
      throw new Error(
        "Reply cooldown is not supported on the current platform",
      );
    }

    this.context.replyCooldown(message);
  }

  public async editMsg(newContent: string) {
    if (!this.context.editMsg) {
      throw new Error(
        "Message editing is not supported on the current platform",
      );
    }
    await this.context.editMsg(newContent);
  }
}
