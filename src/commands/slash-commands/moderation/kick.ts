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
  name: "kick",
  description: "Kick a member from the server",
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  serverOnly: true,
  options: [
    {
      name: "user",
      description: "The user to kick",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for kicking",
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

    if (!member.kickable) {
      return interaction.reply({
        content: `I cannot kick ${user.tag}. They may have higher roles than me or I lack permissions.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const kickEmbed = new EmbedBuilder().setDescription(
        `Successfully kicked ${user.username}\nreason: ${reason}`,
      );
      await member.kick(reason);
      await interaction.reply({
        embeds: [kickEmbed],
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: `Failed to kick ${user.tag}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
});
