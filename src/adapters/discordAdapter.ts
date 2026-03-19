import { Client, GuildMember, Message, TextChannel } from "discord.js";
import TXEventBus from "../core/TXEventBus";
import TXAdapterBuilder, { TXAdapterNormalizeFn } from "./TXAdapterBuilder";
import TXContext, { TXIContext } from "../core/TXContext";
import config from "../../config.json";
import TXCommandParser from "../core/TXCommandParser";
import { before } from "node:test";

export default function createDiscordAdapter(
  client: Client,
  eventBus: TXEventBus,
) {
  return new TXAdapterBuilder()
    .setEventBus(eventBus)
    .setNormalizer(discordNormalizer)
    .setConnector(() => discordConnector(client, eventBus))
    .setMessageSender(discordMessageSender(client))
    .build();
}

function discordNormalizer(raw: unknown): TXContext {
  switch (true) {
    case raw instanceof Message:
      const msg = raw as Message;
      return new TXContext({
        platform: "discord",
        userId: msg.author.id,
        channelId: msg.channelId,
        content: msg.content,
        raw: msg,
        isSelf: msg.author.id === msg.client.user?.id,
        async reply(message: string) {
          await msg.reply(message);
        },
      });
    case raw instanceof GuildMember:
      const member = raw as GuildMember;
      return new TXContext({
        platform: "discord",
        userId: member.id,
        channelId: "0",
        content: "0",
        raw: member,
        isSelf: member.id === member.client.user?.id,
      });
    default:
      throw new Error(`Unsupported type: ${raw}`);
  }
}

function discordConnector(client: Client, eventBus: TXEventBus) {
  client.on("messageCreate", (msg: Message) => {
    if (msg.author.bot) return;

    const context = discordNormalizer(msg);
    if (msg.content.startsWith(config.prefix.default)) {
      let command = new TXCommandParser(msg.content).parseCommandString();
      eventBus.emit("command", context, command);
    } else {
      eventBus.emit("message", context);
    }
  });

  client.on("guildMemberAdd", (member) => {
    const ctx = discordNormalizer(member);
    eventBus.emit("userJoin", ctx);
  });
}

const discordMessageSender = (client: Client) => async (ctx: TXIContext) => {
  const channel = await client.channels.fetch(ctx.channelId);
  if (channel?.isTextBased() && channel.isSendable()) {
    await (channel as TextChannel).send(ctx.content);
  }
};
