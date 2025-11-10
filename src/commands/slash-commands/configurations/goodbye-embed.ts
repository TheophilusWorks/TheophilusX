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
import TXVariable from "../../../structures/TXVariables";

export default new TXSlashCommand({
  name: "goodbye-embed",
  description: "Configure goodbye message (variables supported)",
  cooldown: 2000,
  serverOnly: true,
  options: [
    {
      name: "toggle",
      description: "Toggles goodbye message (on | off)",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "test",
      description: "Sends an embed of how your goodbye embed will look like",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "set",
      description: "Sets the goodbye message for this server",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "new-message",
          description: "The new goodbye message",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "new-title",
          description: "The new goodbye title",
          type: ApplicationCommandOptionType.String,
        },
      ],
    },
  ],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  execute: async ({ interaction, args }) => {
    const subcommand = args.getSubcommand()!;
    let guildConfig = await GuildConfigs.findOne({
      guildId: interaction.guild?.id,
    });
    if (!guildConfig)
      guildConfig = new GuildConfigs({ guildId: interaction.guild?.id });

    const variables = new TXVariable();

    const context = {
      user: interaction.user!,
      member: interaction.member!,
      guild: interaction.guild!,
      channel: interaction.channel!,
    };

    switch (subcommand) {
      case "set":
        const newMessage = args.getString("new-message")!;
        const newTitle = args.getString("new-title") ?? "";

        guildConfig.goodbyeMessage = newMessage;
        guildConfig.goodbyeTitle = newTitle;
        await guildConfig.save();

        const setEmbed = new EmbedBuilder()
          .setColor("Red")
          .setDescription(
            `Successfully changed goodbye message to\n\nTitle: ${guildConfig.goodbyeTitle}\n\`\`\`${guildConfig.goodbyeMessage}\`\`\``
          );

        interaction.reply({ embeds: [setEmbed] });
        break;

      case "toggle":
        guildConfig.goodbyeMessageToggle = !guildConfig.goodbyeMessageToggle;
        await guildConfig.save();

        const toggleEmbed = new EmbedBuilder()
          .setColor("Red")
          .setDescription(
            `Toggled goodbye messages "${guildConfig.goodbyeMessageToggle ? "On" : "Off"}"`
          );

        interaction.reply({ embeds: [toggleEmbed] });
        break;

      case "test":
        const parsedTitle = await variables.parse(guildConfig.goodbyeTitle, context);
        const parsedMessage = await variables.parse(guildConfig.goodbyeMessage, context);

        const testEmbed = new EmbedBuilder()
          .setTitle(parsedTitle || null)
          .setDescription(parsedMessage)
          .setColor("Red");

        interaction.reply({ embeds: [testEmbed] });
        break;
    }
  },
});
