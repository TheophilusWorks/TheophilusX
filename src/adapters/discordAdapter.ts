import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  GuildMember,
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
import { TXMessagePart } from "../core/message/TXMessagePart.js";
import instance from "../instance.js";

// --- resolvers ---

function resolvePartsToString(parts: TXMessagePart[] | undefined): string {
  return (
    parts
      ?.map((p) => (p.type === "text" ? p.value : `<@${p.userId}>`))
      .join("") || ""
  );
}

function resolveMessage(message: TXMessageOptions | string): {
  content: string;
  files: string[];
} {
  if (typeof message === "string") return { content: message, files: [] };
  return {
    content: resolvePartsToString(message.parts),
    files: message.attachments ?? [],
  };
}

// --- adapter ---

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

      client.on("guildMemberAdd", (member) => {
        const isAdmin =
          bot.getConfig().adminIds?.some((id) => id.discordId === member.id) ??
          false;

        const ctx = buildDiscordContext(client, isAdmin, member);
        bot.emit("userJoin", ctx, adapter);
      });

      client.on("guildMemberRemove", (member) => {
        const isAdmin =
          bot.getConfig().adminIds?.some((id) => id.discordId === member.id) ??
          false;

        const ctx = buildDiscordContext(client, isAdmin, member as GuildMember);
        bot.emit("userLeave", ctx, adapter);
      });
      client.on("messageCreate", async (message) => {
        const msg = message as Message;

        const isAdmin =
          bot
            .getConfig()
            .adminIds?.some((id) => id.discordId === msg.author.id) ?? false;

        const usedPrefix = bot.prefixes.find((p) => msg.content.startsWith(p));
        const usedAdminPrefix = bot.adminPrefixes.find((p) =>
          msg.content.startsWith(p),
        );
        const ctx = buildDiscordContext(client, isAdmin, msg);

        if (usedPrefix) {
          const args = new TXCommandArgumentParser(
            usedPrefix,
            msg.content,
            adapter,
            undefined,
          ).parse();

          bot.emit("commandCreate", ctx, args);
        } else if (usedAdminPrefix) {
          const args = new TXCommandArgumentParser(
            usedAdminPrefix,
            msg.content,
            adapter,
          ).parse();
          bot.emit("adminCommandCreate", ctx, args);
        } else {
          bot.emit("messageCreate", ctx, adapter);
        }
      });
    })
    .setMessageSender(async (target, message) => {
      const channel = await client.channels.fetch(target);
      if (!channel?.isTextBased() || !channel.isSendable()) return null;

      const { content, files } = resolveMessage(message);
      const sent = await channel.send({ content, files });

      const ctx = buildDiscordContext(client, false, sent);
      return new TXSentMessage(ctx, discordWaitReply(client, sent.id));
    })
    .setReplySender(async (ctx, msg) => {
      const raw = ctx.raw as Message;
      const { content, files } = resolveMessage(msg);

      const sent = await safeReply(ctx.replied, raw, content, files);
      if (!sent) return null;

      ctx.replied = true;
      return new TXSentMessage(ctx, discordWaitReply(client, sent.id));
    })
    .setAnnouncementSender(async (message) => {
      const { content, files } = resolveMessage(message);
      let first: TXSentMessage | null = null;

      for (const guild of client.guilds.cache.values()) {
        const channel =
          guild.systemChannel ??
          (guild.channels.cache.find(
            (c) =>
              c.isTextBased() &&
              c.isSendable() &&
              c.permissionsFor(guild.members.me!)?.has("SendMessages"),
          ) as any);

        if (!channel?.isTextBased() || !channel.isSendable()) continue;

        const payload: any = { files };
        if (content) {
          payload.embeds = [
            new EmbedBuilder().setDescription(content).setColor("Blurple"),
          ];
        }

        const sent = await channel.send(payload).catch(() => null);
        if (!sent) continue;

        const ctx = buildDiscordContext(client, false, sent);
        const sentMsg = new TXSentMessage(
          ctx,
          discordWaitReply(client, sent.id),
        );
        if (!first) first = sentMsg;
      }

      return first;
    })

    .setUserResolver(async (userId) => {
      try {
        const user = await client.users.fetch(userId);

        // try to find a guild member entry for the display name
        const member = client.guilds.cache
          .map((g) => g.members.cache.get(userId))
          .find(Boolean);

        return {
          id: user.id,
          displayName: member?.displayName ?? user.username,
          username: user.username,
          avatarURL: user.avatarURL() ?? undefined,
          isAdmin:
            instance
              .getConfig()
              .adminIds?.some((a) => a.discordId === user.id) ?? false,
          isSelf: client.user?.id === user.id,
          isEveryone: false,
        };
      } catch {
        return null;
      }
    })
  
    .setEmojiReactor(async (ctx, emoji) => {
      const raw = ctx.raw as Message;
      await raw.react(emoji);
    });

  return adapter;
}

// --- wait reply ---

function makeDiscordReplyFn(
  client: Client,
  incoming: TXIContext,
  raw: Message,
) {
  return async (
    msg: TXMessageOptions | string,
  ): Promise<TXSentMessage | null> => {
    const { content, files } = resolveMessage(msg);
    const sent = await safeReply(incoming.replied, raw, content, files);
    if (!sent) return null;

    incoming.replied = true;
    return new TXSentMessage(incoming, discordWaitReply(client, sent.id));
  };
}

function discordWaitReply(client: Client, sentMessageId: string) {
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
        if (raw.reference?.messageId !== sentMessageId) return;

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
  raw: unknown,
): TXIContext {
  if (raw && raw instanceof Message) {
    let msg = raw as Message;
    return {
      platform: TXPlatform.Discord,
      content: msg.content,
      author: {
        id: msg.author.id,
        displayName: msg.member?.displayName ?? msg.author.username,
        username: msg.author.username,
        isAdmin,
        isSelf: client.user?.id === msg.author.id,
        avatarURL: msg.author.avatarURL() ?? undefined,
        isEveryone: msg.mentions.everyone,
      },
      mentions: msg.mentions.users.map((user) => {
        const member = msg.guild?.members.cache.get(user.id);
        return {
          id: user.id,
          displayName: member?.displayName ?? user.username,
          username: user.username,
          isAdmin:
            instance
              .getConfig()
              .adminIds?.some((a) => a.discordId === user.id) ?? false,
          isSelf: client.user?.id === user.id,
          avatarURL: user.avatarURL() ?? undefined,
          isEveryone: false,
        };
      }),
      channelId: msg.channelId,
      serverId: msg.guildId ?? "0",
      timestamp: msg.createdAt,
      metadata: {},
      replied: false,
      raw,
    };
  }
  let member = raw as GuildMember;
  const welcomeChannel =
    member.guild.systemChannel?.id ??
    member.guild.channels.cache.find((c) => c.isTextBased() && c.isSendable())
      ?.id ??
    "";

  return {
    platform: TXPlatform.Discord,
    content: "",
    author: {
      id: member.id,
      displayName: member.displayName,
      username: member.user.username,
      isAdmin,
      isSelf: client.user?.id === member.id,
      avatarURL: member.user.avatarURL() ?? undefined,
      isEveryone: false,
    },
    mentions: [],
    channelId: welcomeChannel,
    serverId: member.guild.id,
    timestamp: new Date(),
    metadata: {},
    replied: false,
    raw,
  };
}

async function safeReply(
  replied: boolean,
  msg: Message,
  content: string,
  files: string[],
): Promise<Message | null> {
  const payload: any = { files };

  if (content) {
    payload.embeds = [
      new EmbedBuilder().setDescription(content).setColor("Blurple"),
    ];
  }

  if (replied) {
    if (!msg.channel.isTextBased() || !msg.channel.isSendable()) return null;
    return await msg.channel.send(payload);
  }

  return await msg.reply(payload);
}
