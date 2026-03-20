import { Client, EmbedBuilder, GuildMember, Message, TextChannel } from "discord.js";
import TXEventBus from "../core/TXEventBus";
import TXAdapterBuilder from "./TXAdapterBuilder";
import config from "../../config.json";
import TXCommandParser from "../core/TXCommandParser";
import TXContextBuilder, { TXContext } from "../core/TXContextBuilder";
import TXMessageHandle from "../core/TXMessageHandle";
import { instance } from "../main";

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

function discordNormalizer(raw: unknown): TXContextBuilder {
  switch (true) {
    case raw instanceof Message:
      const embed = new EmbedBuilder().setColor("Blurple")
      const msg = raw as Message;
      return new TXContextBuilder({
        platform: "discord",
        userId: msg.author.id,
        channelId: msg.channelId,
        content: msg.content,
        raw: msg,
        replySent: false,
        isSelf: msg.author.id === msg.client.user?.id,
        async reply(message: string): Promise<TXMessageHandle> {
          if (this.replySent) throw new Error("Double reply error");

          embed.setDescription(message)
          const sent = await msg.reply({ embeds: [embed] });
          this.replySent = true;

          return {
            async editMsg(newContent) {
              embed.setDescription(newContent)
              await sent.edit({ embeds: [embed] })
            },
          }
        },
      });
    case raw instanceof GuildMember:
      const member = raw as GuildMember;
      return new TXContextBuilder({
        platform: "discord",
        replySent: false,
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
      eventBus.dispatch("command", context, command, instance.getAdapter("discord"));
    } else {
      eventBus.dispatch("message", context, instance.getAdapter("discord"));
    }
  });

  client.on("guildMemberAdd", (member) => {
    const ctx = discordNormalizer(member);
    eventBus.emit("userJoin", ctx, instance.getAdapter("discord"));
  });
}

const discordMessageSender = (client: Client) => async (ctx: TXContext) => {
  const channel = await client.channels.fetch(ctx.channelId);
  if (channel?.isTextBased() && channel.isSendable()) {
    await (channel as TextChannel).send(ctx.content);
  }
};
