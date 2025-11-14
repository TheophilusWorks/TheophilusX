import TXSlashCommand from "../../../structures/TXSlashCommand";
import {
  PermissionFlagsBits,
  ApplicationCommandOptionType,
  EmbedBuilder,
  GuildBasedChannel,
} from "discord.js";
import GuildConfigs from "../../../database/models/GuildConfigs";
import { IEmbed } from "../../../database/models/GuildConfigs";
import { TXVariableParserContext } from "../../../typings/Variables";
import buildEmbed from "../../../utils/buildEmbed";
import TXVariable from "../../../structures/TXVariables";

export default new TXSlashCommand({
  name: "welcome-embed",
  description: "Configure your welcome embed",
  serverOnly: true,
  options: [
    {
      name: "set",
      description: "Set your welcome embed",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "embed-name",
          description:
            "Embed name(s) from /embed-builder (comma-separated for multiple, e.g., welcome1,welcome2)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "channel",
          description: "The channel where the welcome embed will be sent",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
        {
          name: "message",
          description: "Message before the embed",
          type: ApplicationCommandOptionType.String,
        },
      ],
    },
    {
      name: "toggle",
      description: "Toggles welcome embed",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "enabled",
          description: "Should it be enabled?",
          type: ApplicationCommandOptionType.Boolean,
          required: true,
        },
      ],
    },
    {
      name: "test",
      description: "Sends the welcome embed",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  execute: async ({ interaction, args }) => {
    await interaction.deferReply();

    const guildConfig = await GuildConfigs.findOne({
      guildId: interaction.guild!.id,
    });
    if (!guildConfig)
      return interaction.editReply({
        content:
          "No guild configurations found... Create one with `/embed-builder`",
      });

    const txVariable = new TXVariable();
    const subcommand = args.getSubcommand();
    const context: TXVariableParserContext = {
      user: interaction.user,
      member: interaction.member,
      guild: interaction.guild!,
      channel: interaction.channel!,
    };

    if (!subcommand)
      return interaction.editReply({
        content: "Invalid subcommand!",
      });

    switch (subcommand) {
      case "toggle": {
        const isEnabled = args.getBoolean("enabled")!;
        guildConfig.welcomeEmbedIsEnabled = isEnabled;
        await guildConfig.save();

        const state = isEnabled ? "Enabled" : "Disabled";
        return interaction.editReply({
          content: `Successfully ${state} welcome embed`,
        });
      }

      case "test": {
        const parsedMessage = guildConfig.welcomeMessage
          ? await txVariable.parse(guildConfig.welcomeMessage, context)
          : null;

        const embeds: EmbedBuilder[] = await setupEmbeds(
          guildConfig.welcomeEmbeds,
          context,
        );

        if (!parsedMessage && embeds.length === 0)
          return interaction.editReply({
            content:
              "No welcome embed(s)/message found...\nConfigure welcome embed(s) with `/goodbye-embed set`",
          });

        return interaction.editReply({
          content: parsedMessage || undefined,
          embeds,
        });
      }

      case "set": {
        const embedName = args.getString("embed-name")!;
        const channel = args.getChannel("channel") as GuildBasedChannel | null;
        const attachedMessage = args.getString("message") || null;

        if (!channel || !channel.isTextBased())
          return interaction.editReply({
            content: "Channel not found or is not text-based",
          });

        const embedNames = embedName
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);

        const foundEmbedConfigs = findEmbeds(embedNames, guildConfig.embeds);

        if (!foundEmbedConfigs)
          return interaction.editReply({
            content: "One or more embeds not found",
          });

        guildConfig.welcomeEmbeds = foundEmbedConfigs;
        guildConfig.welcomeMessage = attachedMessage;
        guildConfig.welcomeEmbedIsEnabled = true;
        guildConfig.welcomeChannelId = channel.id;
        await guildConfig.save();

        return interaction.editReply({
          content:
            "Successfully setup welcome embed\nView it with `/welcome-embed test`",
        });
      }
    }
  },
});

async function setupEmbeds(
  embedConfigs: IEmbed[],
  context: TXVariableParserContext,
): Promise<EmbedBuilder[]> {
  const embeds: EmbedBuilder[] = [];
  for (const config of embedConfigs) {
    if (embeds.length >= 10) break;
    const builtEmbed = await buildEmbed(config, context);
    embeds.push(builtEmbed);
  }
  return embeds;
}

function findEmbeds(embedNames: string[], embeds: IEmbed[]): IEmbed[] | null {
  const embedConfigs: IEmbed[] = [];

  for (const name of embedNames) {
    const found = embeds.find((e) => e.name === name);
    if (!found) return null;
    embedConfigs.push(found);
  }

  return embedConfigs;
}
