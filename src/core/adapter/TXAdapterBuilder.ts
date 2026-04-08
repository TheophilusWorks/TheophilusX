import { TXIContext } from "../context/TXContext.js";
import TXMessageOptions from "../message/TXMessageOptions.js";
import TXSentMessage from "../message/TXSentMessage.js";

export default class TXAdapterBuilder {
  public loginManager: () => Promise<void>;
  public messageSender: (target: string, message: TXMessageOptions | string) => Promise<TXSentMessage | null>;
  public replySender: (ctx: TXIContext, message: TXMessageOptions | string) => Promise<TXSentMessage | null>;

  constructor() {
    this.loginManager = async () => { throw new Error("loginManager not set"); };
    this.messageSender = async () => { throw new Error("messageSender not set"); };
    this.replySender = async () => { throw new Error("replySender not set"); };
  }

  public setLoginManager(callback: () => Promise<void>) {
    this.loginManager = callback;
    return this;
  }

  public setMessageSender(callback: (target: string, message: TXMessageOptions | string) => Promise<TXSentMessage | null>) {
    this.messageSender = callback;
    return this;
  }

  public setReplySender(callback: (ctx: TXIContext, message: TXMessageOptions | string) => Promise<TXSentMessage | null>) {
    this.replySender = callback;
    return this;
  }

  public async login() {
    await this.loginManager();
  }

  public async sendMessage(target: string, message: string | TXMessageOptions): Promise<TXSentMessage> {
    const sent = await this.messageSender(target, message);
    if (!sent) throw new Error("Failed to send message");
    return sent;
  }

  public async reply(ctx: TXIContext, message: string | TXMessageOptions): Promise<TXSentMessage> {
    const sent = await this.replySender(ctx, message);
    if (!sent) throw new Error("Failed to send reply");
    return sent;
  }
}
