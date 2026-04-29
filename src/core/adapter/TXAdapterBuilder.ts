import { TXIAuthor, TXIContext } from "../context/TXContext.js";
import TXMessageOptions from "../message/TXMessageOptions.js";
import TXSentMessage from "../message/TXSentMessage.js";

export default class TXAdapterBuilder {
  public loginManager: () => Promise<void>;
  public messageSender: (
    target: string,
    message: TXMessageOptions | string,
  ) => Promise<TXSentMessage | null>;
  public replySender: (
    ctx: TXIContext,
    message: TXMessageOptions | string,
  ) => Promise<TXSentMessage | null>;
  public announcementSender: (
    message: TXMessageOptions | string,
  ) => Promise<TXSentMessage | null>;
  public userResolver: (userId: string) => Promise<TXIAuthor | null>;
  public emojiReactor: (ctx: TXIContext, emoji: string) => Promise<void>;

  constructor() {
    this.loginManager = async () => {
      throw new Error("loginManager not set");
    };
    this.messageSender = async () => {
      throw new Error("messageSender not set");
    };
    this.replySender = async () => {
      throw new Error("replySender not set");
    };
    this.announcementSender = async () => {
      throw new Error("announcementSender not set");
    };
    this.userResolver = async () => {
      throw new Error("userResolver not set");
    };
    this.emojiReactor = async () => {
      throw new Error("emojiReactor not set");
    };
  }

  public setLoginManager(callback: () => Promise<void>) {
    this.loginManager = callback;
    return this;
  }

  public setAnnouncementSender(
    callback: (
      message: TXMessageOptions | string,
    ) => Promise<TXSentMessage | null>,
  ) {
    this.announcementSender = callback;
    return this;
  }

  public setMessageSender(
    callback: (
      target: string,
      message: TXMessageOptions | string,
    ) => Promise<TXSentMessage | null>,
  ) {
    this.messageSender = callback;
    return this;
  }

  public setReplySender(
    callback: (
      ctx: TXIContext,
      message: TXMessageOptions | string,
    ) => Promise<TXSentMessage | null>,
  ) {
    this.replySender = callback;
    return this;
  }

  public setUserResolver(
    callback: (userId: string) => Promise<TXIAuthor | null>,
  ) {
    this.userResolver = callback;
    return this;
  }

  public setEmojiReactor(callback: (ctx: TXIContext, emoji: string) => Promise<void>) {
    this.emojiReactor = callback;
    return this;
  }

  public async login() {
    await this.loginManager();
  }

  public async sendMessage(
    target: string,
    message: string | TXMessageOptions,
  ): Promise<TXSentMessage> {
    const sent = await this.messageSender(target, message);
    if (!sent) throw new Error("Failed to send message");
    return sent;
  }

  public async reply(
    ctx: TXIContext,
    message: string | TXMessageOptions,
  ): Promise<TXSentMessage> {
    const sent = await this.replySender(ctx, message);
    if (!sent) throw new Error("Failed to send reply");
    return sent;
  }

  public async announce(
    message: string | TXMessageOptions,
  ): Promise<TXSentMessage> {
    const sent = await this.announcementSender(message);
    if (!sent) throw new Error("Failed to send reply");
    return sent;
  }

  public async resolveUser(userId: string): Promise<TXIAuthor | null> {
    return this.userResolver(userId);
  }

  public async reactEmoji(ctx: TXIContext, emoji: string): Promise<void> {
    return this.emojiReactor(ctx, emoji);
  }
}
