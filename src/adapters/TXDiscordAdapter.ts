import { Client, Message } from "discord.js";
import TXEventBus from "../core/TXEventBus";
import TXAdapter from "./TXAdapter";
import TXContext, { TXIContext } from "../core/TXContext";

export default class TXDiscordAdapter extends TXAdapter {
  private client: Client;

  constructor(eventBus: TXEventBus, token: string, client: Client) {
    super(eventBus);
    this.client = client;
  }

  public getClient(): Client {
    return this.client;
  }

  public async connect() {
    this.client.on("messageCreate", (msg) => {
      if (msg.author.bot) return;

      let context = this.normalizeEvent(msg);

      this.eventBus.emit("message", context);
    });
  }

  public async sendMessage({ channelId, content }: TXIContext): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);

    if (!channel) return;

    if (channel.isTextBased() && channel.isSendable()) {
      await channel.send(content);
    }
  }

  public normalizeEvent(msg: Message) {
    return new TXContext({
      platform: "discord",
      userId: msg.author.id,
      channelId: msg.channelId,
      content: msg.content,
      raw: msg,
      isSelf: msg.author.id == this.client.user?.id,
      async reply(message: string) {
        await msg.reply(message);
      },
    });
  }
}
