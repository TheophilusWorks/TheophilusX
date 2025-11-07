/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";

export default new TXSlashCommand({
  name: "ban",
  description: "Ban a member from the server",
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  serverOnly: true,
  options: [
    {
      name: "user",
      description: "The user to ban",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for baning",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  execute: async ({ interaction, args }) => {
    const user = args.getUser("user")!;
    const reason = args.getString("reason") || "No reason provided";

    const member = interaction.guild?.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({
        content: `Cannot find that member in this server.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!member.bannable) {
      return interaction.reply({
        content: `I cannot ban ${user.username}. They may have higher roles than me or I lack permissions.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const banEmbed = new EmbedBuilder().setDescription(
        `Successfully banned ${user.username}\nreason: ${reason}`,
      );
      await member.ban({ reason });
      await interaction.reply({
        embeds: [banEmbed],
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: `Failed to ban ${user.tag}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
});
