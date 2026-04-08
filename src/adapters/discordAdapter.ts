import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Message,
  Options,
  Partials,
} from "discord.js";
import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder.js";
import { TXIContext, TXPlatform } from "../core/context/TXContext.js";
import TheophilusX from "../core/TheophilusX.js";
import TXCommandArgumentParser from "../core/command/parser/TXCommandParser.js";
import TXSentMessage, {
  TXIWaitReplyOptions,
} from "../core/message/TXSentMessage.js";
import TXMessage from "../core/message/TXMessage.js";
import TXMessageOptions from "../core/message/TXMessageOptions.js";

export default function buildDiscordAdapter(bot: TheophilusX, token: string) {
  const client = new Client({
    intents: Object.values(GatewayIntentBits).filter(
      (v) => typeof v === "number",
    ) as GatewayIntentBits[],
    partials: Object.values(Partials).filter(
      (v) => typeof v === "number",
    ) as Partials[],
    allowedMentions: {
      parse: ["users", "roles", "everyone"],
      repliedUser: true,
    },
    failIfNotExists: false,
    makeCache: Options.cacheWithLimits({
      GuildMemberManager: 200,
      UserManager: 200,
    }),
    sweepers: {
      messages: {
        interval: 3600,
        lifetime: 1800,
      },
    },
  });

  const adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      await client.login(token);

      client.on("messageCreate", async (message) => {
        const msg = message as Message;

        const isAdmin =
          bot
            .getConfig()
            .adminIds?.some((id) => id.discordId === msg.author.id) ?? false;

        const usedPrefix = bot.prefixes.find((p) => msg.content.startsWith(p));

        if (usedPrefix) {
          const args = new TXCommandArgumentParser(
            usedPrefix,
            msg.content,
            adapter,
            undefined,
            buildDiscordContext(client, isAdmin, msg),
          ).parse();

          bot.emit("commandCreate", args);
        } else {
          bot.emit(
            "messageCreate",
            buildDiscordContext(client, isAdmin, msg),
            adapter,
          );
        }
      });
    })
    .setMessageSender(async (target, message) => {
      const channel = await client.channels.fetch(target);
      if (!channel?.isTextBased() || !channel.isSendable()) return null;

      const sent =
        typeof message === "string"
          ? await channel.send(message)
          : await channel.send({
              content: message.message,
              files: message.attachments,
            });

      const ctx = buildDiscordContext(client, false, sent);
      return new TXSentMessage(ctx, discordWaitReply(client));
    })
    .setReplySender(async (ctx, msg) => {
      const raw = ctx.raw as Message;

      const sent =
        typeof msg === "string"
          ? await safeReply(ctx.replied, raw, msg, [])
          : await safeReply(
              ctx.replied,
              raw,
              msg.message,
              msg.attachments ?? [],
            );

      if (!sent) return null;

      ctx.replied = true;
      return new TXSentMessage(ctx, discordWaitReply(client));
    });

  return adapter;
}

function makeDiscordReplyFn(
  client: Client,
  incoming: TXIContext,
  raw: Message,
): (msg: TXMessageOptions | string) => Promise<TXSentMessage | null> {
  return async (msg) => {
    const sent =
      typeof msg === "string"
        ? await safeReply(incoming.replied, raw, msg, [])
        : await safeReply(
            incoming.replied,
            raw,
            msg.message,
            msg.attachments ?? [],
          );

    if (!sent) return null;

    incoming.replied = true;
    return new TXSentMessage(incoming, discordWaitReply(client));
  };
}

function discordWaitReply(client: Client) {
  return function (
    ctx: TXIContext,
    options: TXIWaitReplyOptions,
  ): Promise<TXMessage | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        client.off("messageCreate", handler);
        resolve(null);
      }, options.timeout);

      function handler(raw: Message) {
        if (raw.channelId !== ctx.channelId) return;

        const incoming = buildDiscordContext(client, ctx.author.isAdmin, raw);
        if (options.filter && !options.filter(incoming)) return;

        clearTimeout(timer);
        client.off("messageCreate", handler);

        resolve(
          new TXMessage(incoming, makeDiscordReplyFn(client, incoming, raw)),
        );
      }

      client.on("messageCreate", handler);
    });
  };
}

// --- helpers ---

function buildDiscordContext(
  client: Client,
  isAdmin: boolean,
  msg: Message,
): TXIContext {
  return {
    platform: TXPlatform.Discord,
    content: msg.content,
    author: {
      id: msg.author.id,
      displayName: msg.member?.displayName ?? msg.author.username,
      username: msg.author.username,
      isAdmin,
      isSelf: client.user?.id === msg.author.id,
    },
    channelId: msg.channelId,
    serverId: msg.guildId ?? undefined,
    timestamp: msg.createdAt,
    replied: false,
    raw: msg,
  };
}

async function safeReply(
  replied: boolean,
  msg: Message,
  content: string,
  files: string[],
): Promise<Message | null> {
  const embed = new EmbedBuilder().setDescription(content).setColor("Blurple");

  if (replied) {
    if (!msg.channel.isTextBased() || !msg.channel.isSendable()) return null;
    return await msg.channel.send({ embeds: [embed], files });
  }

  return await msg.reply({ embeds: [embed], files });
}
