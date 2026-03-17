import { TXPlatform } from "./TXPlatform";

export interface TXIContext {
  platform: TXPlatform;
  userId: string;
  channelId: string;
  content: string;
  raw: any;
  isSelf: boolean;
  reply?: (message: string) => Promise<void>;
}

export default class TXContext {
  private context: TXIContext;

  constructor(context: TXIContext) {
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

  get channelId() {
    return this.context.channelId;
  }

  get content() {
    return this.context.content;
  }

  get raw() {
    return this.context.raw;
  }

  // reply function, delegated to adapter
  public async reply(message: string) {
    if (!this.context.reply) {
      throw new Error("Reply function not attached for this context");
    }
    await this.context.reply(message);
  }
}
