/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import {
  PermissionFlagsBits,
  ApplicationCommandOptionType,
  EmbedBuilder,
} from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";
import GuildConfigs from "../../../database/models/GuildConfigs";
import { TXVariableParserContext } from "../../../typings/Variables";
import buildEmbed from "../../../utils/buildEmbed";

export default new TXSlashCommand({
  name: "welcome-embed",
  description: "Manage your welcome embed",
  userPermissions: [PermissionFlagsBits.ManageGuild],
  serverOnly: true,
  options: [
    {
      name: "set",
      description: "Set your welcome embed",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "embed-name",
          description: "Name of the embed (configurable in /embed-builder)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "channel",
          description: "The channel where to send the embed",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
      ],
    },
    {
      name: "toggle",
      description: "Toggle the welcome embed on/off",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "test",
      description: "Preview the current welcome embed",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  execute: async ({ interaction, args }) => {
    await interaction.deferReply();

    const guildConfig = await GuildConfigs.findOne({
      guildId: interaction.guild?.id,
    });

    if (!guildConfig) {
      return interaction.editReply({
        content:
          "No guild config found in this server...\nCreate one with `/embed-builder`",
      });
    }

    const subcommand = args.getSubcommand();

    switch (subcommand) {
      case "set": {
        const embedName = args.getString("embed-name")!;
        const channel = args.getChannel("channel")!
        const embedConfig = guildConfig.embeds.find(
          (data) => data.name === embedName,
        );

        if (!embedConfig) {
          return interaction.editReply({
            content: `An embed with a name of "${embedName}" was not found...\nCreate one with \`/embed-builder\``,
          });
        }

        guildConfig.welcomeChannel = channel.id
        guildConfig.welcomeEmbed = embedConfig;
        guildConfig.welcomeToggle = true
        await guildConfig.save();

        const context: TXVariableParserContext = {
          user: interaction.user,
          member: interaction.member,
          guild: interaction.guild!,
          channel: interaction.channel!,
        };

        const previewEmbed = await buildEmbed(embedConfig, context);

        return interaction.editReply({
          content: `Welcome embed has been set to "${embedName}"!`,
          embeds: [previewEmbed],
        });
      }

      case "toggle": {
        guildConfig.welcomeToggle = !guildConfig.goodbyeToggle;
        await guildConfig.save();

        const status = guildConfig.welcomeToggle ? "enabled" : "disabled";

        return interaction.editReply({
          content: `Welcome embed has been **${status}**!`,
        });
      }

      case "test": {
        if (!guildConfig.welcomeEmbed) {
          return interaction.editReply({
            content:
              "No welcome embed has been set yet!\nSet one with `/welcome-embed set`",
          });
        }

        const context: TXVariableParserContext = {
          user: interaction.user,
          member: interaction.member,
          guild: interaction.guild!,
          channel: interaction.channel!,
        };

        const testEmbed = await buildEmbed(guildConfig.welcomeEmbed, context);

        return interaction.editReply({
          content: "**Welcome Embed Preview:**",
          embeds: [testEmbed],
        });
      }

      default:
        return interaction.editReply({
          content: "Invalid subcommand!",
        });
    }
  },
});
