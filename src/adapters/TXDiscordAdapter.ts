import {
  Client,
  GatewayIntentBits,
  Partials,
  Options,
  Message,
} from "discord.js";
import TXEventBus from "../core/TXEventBus";
import TXAdapter from "./TXAdapter";
import TXContext, { TXIContext } from "../core/TXContext";

export default class TXDiscordAdapter extends TXAdapter {
  private client: Client;

  constructor(eventBus: TXEventBus, token: string) {
    super(eventBus);

    this.client = new Client({
      // enable every intent
      intents: Object.values(GatewayIntentBits).filter(
        (v) => typeof v === "number",
      ) as GatewayIntentBits[],

      // enable every partial
      partials: Object.values(Partials).filter(
        (v) => typeof v === "number",
      ) as Partials[],

      allowedMentions: {
        parse: ["users", "roles", "everyone"],
        repliedUser: true,
      },

      failIfNotExists: false,

      // cache limits
      makeCache: Options.cacheWithLimits({
        GuildMemberManager: 200,
        UserManager: 200,
        MessageManager: 500,
      }),

      // sweepers for memory cleanup
      sweepers: {
        messages: { interval: 3600, lifetime: 1800 },
      },
    });

    this.client.login(token);
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
      async reply(message: string) {
        await msg.reply(message);
      },
    });
  }
}
