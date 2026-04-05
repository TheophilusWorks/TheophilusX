export default class TXAdapterBuilder {
  public loginManager?: () => Promise<void>;
  public messageSender?: (target: string, message: string) => Promise<void>;
  public replySender?: (message: string) => Promise<void>;

  public setLoginManager(callback: () => Promise<void>) {
    this.loginManager = callback;
    return this;
  }

  public setMessageSender(
    callback: (target: string, message: string) => Promise<void>,
  ) {
    this.messageSender = callback;
    return this;
  }

  public setReplySender(callback: (message: string) => Promise<void>) {
    this.replySender = callback;
    return this;
  }

  public async login() {
    await this.loginManager?.();
  }
  public async sendMessage(target: string, message: string) {
    await this.messageSender?.(target, message);
  }
  public async reply(message: string) {
    await this.replySender?.(message);
  }
}
