/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";
import ms = require("ms");
import prettyMilliseconds from "pretty-ms";
import { GuildInteraction } from "../../../typings/Command";

export default new TXSlashCommand({
  name: "timeout",
  description: "Timeout a member",
  userPermissions: [PermissionFlagsBits.MuteMembers],
  botPermissions: [PermissionFlagsBits.MuteMembers],
  serverOnly: true,
  options: [
    {
      name: "user",
      description: "The user you want to timeout",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "duration",
      description: "Timeout duration (e.g., 1h 50m 10s, 1m, 10h, ...)",
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "reason",
      description: "Reason for timeout",
      type: ApplicationCommandOptionType.String,
    },
  ],
  execute: async ({ interaction, args }) => {
    const targetUser = args.getUser("user")!;
    const duration = args.getString("duration") || "10m";
    const reason = args.getString("reason") || "No reason provided";

    await interaction.deferReply();

    const timeoutEmbed = new EmbedBuilder().setColor("Blurple");

    if (targetUser.bot) {
      timeoutEmbed.setDescription("You cannot timeout a bot!").setColor("Red");
      return interaction.editReply({
        embeds: [timeoutEmbed],
      });
    }

    const member = interaction.guild?.members.cache.get(targetUser.id);
    const bot = interaction.guild?.members.me!;

    if (!member)
      return interaction.editReply({
        content: `This user is not in this server`,
      });

    const memberHighestRole = member?.roles.highest.position;
    const botHighestRole = bot?.roles.highest.position;

    if (memberHighestRole >= botHighestRole) {
      timeoutEmbed
        .setDescription(
          `I cannot timeout ${member.user.username} as their role hierarchy is higher/equal to mine`,
        )
        .setColor("Red");
      return interaction.editReply({ embeds: [timeoutEmbed] });
    }

    const timeoutUntil = member.communicationDisabledUntilTimestamp || 0;
    const durationInMs = ms(duration as ms.StringValue);

    if (Date.now() < timeoutUntil) {
      try {
        await notifyTimeoutStatus(
          interaction,
          member,
          timeoutEmbed,
          durationInMs,
        );
      } catch {
        return;
      }
    }

    await member.timeout(durationInMs, reason);
    timeoutEmbed.setDescription(
      `Timed out ${member.user.displayName} for ${prettyMilliseconds(durationInMs)}\nReason: ${reason}`,
    );
    interaction.editReply({
      embeds: [timeoutEmbed],
      components: [],
    });
  },
});

async function notifyTimeoutStatus(
  interaction: GuildInteraction,
  member: GuildMember,
  timeoutEmbed: EmbedBuilder,
  durationInMs: number,
) {
  return new Promise(async (resolve, reject) => {
    const timeoutDuration = member.communicationDisabledUntilTimestamp || 0;
    const timeoutUntilMs = timeoutDuration - Date.now();
    const timeoutUntil =
      timeoutUntilMs <= 0 ? "0s" : prettyMilliseconds(timeoutUntilMs);

    timeoutEmbed.setDescription(
      `This user is currently timed out for **${timeoutUntil}**.\nDo you want to reset it to **${prettyMilliseconds(durationInMs)}**?`,
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("timeout-keep")
        .setLabel("Keep")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("timeout-yes")
        .setLabel("Yes")
        .setStyle(ButtonStyle.Primary),
    );

    const reply = interaction.editReply({
      embeds: [timeoutEmbed],
      components: [row],
    });

    const collector = (await reply).createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
    });

    collector.on("collect", async (interact) => {
      const intEmbed = new EmbedBuilder().setColor("Blurple");
      if (interact.user.id !== interaction.user.id) {
        intEmbed.setDescription("You do not own this `/timeout` session");
        return interact.reply({
          embeds: [intEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interact.customId === "timeout-yes") {
        collector.stop("yes");
        resolve(true);
      } else if (interact.customId === "timeout-keep") {
        const keepEmbed = new EmbedBuilder()
          .setColor("Yellow")
          .setDescription(
            `Keeping ${member.user.displayName}'s remaining timeout of **${timeoutUntil}**.`,
          );
        await interaction.editReply({
          embeds: [keepEmbed],
          components: [],
        });
        collector.stop("keep");
        reject();
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "yes" && reason !== "keep") reject();
    });
  });
}
