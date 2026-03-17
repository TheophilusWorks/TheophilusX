import { TXPlatform } from "./TXPlatform";

export interface TXIContext {
  platform: TXPlatform;
  userId: string;
  channelId: string;
  content: string;
  raw: any;
  reply?: (message: string) => Promise<void>;
}

export default class TXContext {
  private context: TXIContext;

  constructor(context: TXIContext) {
    this.context = context;
  }

  // getters for easy access
  get platform() {
    return this.context.platform;
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
