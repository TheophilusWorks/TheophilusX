import { Client, Message, TextChannel } from "discord.js";
import TXEventBus from "../core/TXEventBus";
import TXAdapterBuilder, { TXAdapterNormalizeFn } from "./TXAdapterBuilder";
import TXContext, { TXIContext } from "../core/TXContext";

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

const discordNormalizer: TXAdapterNormalizeFn = (raw: unknown): TXContext => {
  let msg = raw as Message;
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
};

function discordConnector(client: Client, eventBus: TXEventBus) {
  client.on("messageCreate", (msg: Message) => {
    if (msg.author.bot) return;
    const context = discordNormalizer(msg);
    eventBus.emit("message", context);
  });
}

const discordMessageSender = (client: Client) => async (ctx: TXIContext) => {
  const channel = await client.channels.fetch(ctx.channelId);
  if (channel?.isTextBased() && channel.isSendable()) {
    await (channel as TextChannel).send(ctx.content);
  }
};
