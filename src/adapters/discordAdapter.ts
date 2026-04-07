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

  let adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      await client.login(token);

      client.on("messageCreate", async (message) => {
        let msg = message as Message;

        let isAdmin = bot
          .getConfig()
          .adminIds?.find((id) => id.discordId == msg.author.id)
          ? true
          : false;

        const usedPrefix = bot.prefixes.find((p) => msg.content.startsWith(p));

        if (usedPrefix) {
          const args = new TXCommandArgumentParser(
            usedPrefix,
            msg.content,
            adapter,
            undefined,
            buildDiscordContext(client, isAdmin, message),
          ).parse();

          bot.emit("commandCreate", args);
        } else {
          bot.emit(
            "messageCreate",
            buildDiscordContext(client, isAdmin, message),
            adapter,
          );
        }
      });
    })
    .setMessageSender(async (target, message) => {
      let channel = await client.channels.fetch(target);

      if (channel && channel?.isTextBased() && channel.isSendable()) {
        if (typeof message === "string") {
          await channel.send(message);
          return;
        }
        await channel.send({
          content: message.message,
          files: message.attachments,
        });
      }
    })
    .setReplySender(async (ctx, msg) => {
      let message = ctx.raw as Message;

      if (typeof msg === "string") {
        ctx.replied = await safeReply(ctx.replied, message, msg, []);
        return;
      }

      ctx.replied = await safeReply(
        ctx.replied,
        message,
        msg.message,
        msg.attachments ?? [],
      );
    });

  return adapter;
}

function buildDiscordContext(
  client: Client,
  isAdmin: boolean,
  msg: Message<boolean>,
): TXIContext {
  return {
    platform: TXPlatform.Discord,
    content: msg.content,
    author: {
      id: msg.author.id,
      displayName: msg.member?.displayName || msg.author.username,
      username: msg.author.username,
      isAdmin: isAdmin ? true : false,
      isSelf: client.user?.id === msg.author.id,
    },
    channelId: msg.channelId,
    serverId: msg.guildId || undefined,
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
) {
  let embed = new EmbedBuilder().setDescription(content).setColor("Blurple");

  if (replied) {
    if (!msg.channel.isTextBased() || !msg.channel.isSendable()) return false;
    await msg.channel.send({ embeds: [embed], files });
    return true;
  }

  await msg.reply({ embeds: [embed], files });
  return true;
}
