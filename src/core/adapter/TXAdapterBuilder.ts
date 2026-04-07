import { TXIContext } from "../context/TXContext.js";
import TXMessage from "../message/TXMessage.js";

export default class TXAdapterBuilder {
  public loginManager?: () => Promise<void>;
  public messageSender?: (target: string, message: TXMessage | string) => Promise<void>;
  public replySender?: (
    ctx: TXIContext,
    message: TXMessage | string,
  ) => Promise<void>;

  public setLoginManager(callback: () => Promise<void>) {
    this.loginManager = callback;
    return this;
  }

  public setMessageSender(
    callback: (target: string, message: TXMessage | string) => Promise<void>,
  ) {
    this.messageSender = callback;
    return this;
  }

  public setReplySender(
    callback: (
      ctx: TXIContext,
      message: TXMessage | string,
    ) => Promise<void>,
  ) {
    this.replySender = callback;
    return this;
  }

  public async login() {
    await this.loginManager?.();
  }
  public async sendMessage(target: string, message: string) {
    await this.messageSender?.(target, message);
  }
  public async reply(ctx: TXIContext, message: string | TXMessage) {
    await this.replySender?.(ctx, message);
  }
}
