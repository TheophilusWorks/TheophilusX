/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { GuildInteraction } from "../../../typings/Command";
import TXSlashCommand from "../../../structures/TXSlashCommand";
import {
  ApplicationCommandOptionType,
  CommandInteractionOptionResolver,
  GuildBasedChannel,
} from "discord.js";
import VerifyTemplateSchema from "../../../database/models/VerifyTemplateSchema";
import { Document } from "mongoose";
import { IVerifyTemplate } from "../../../database/models/VerifyTemplateSchema";
import { EmbedBuilder } from "discord.js";
import config from "../../../../txconfig.json";

export default new TXSlashCommand({
  name: "configure-verify",
  description: "Configure the verify system here",
  serverOnly: true,
  options: [
    {
      name: "toggle",
      description: "Toggle verify command",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "set",
      description: "Set verify command",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "verification-message",
          description: "The verification message that new members will see",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "verification-channel",
          description: "The channel where the message will be sent",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
        {
          name: "verified-role",
          description: "The role verified users will get",
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
  ],
  execute: async ({ interaction, args }) => {
    const subcommand = args.getSubcommand();
    const verifyTemplateSchema = await VerifyTemplateSchema.findOne({
      guildId: interaction.guild?.id,
    });

    await interaction.deferReply();

    if (subcommand === "toggle")
      toggleVerify(interaction, verifyTemplateSchema);
    else if (subcommand === "set")
      setVerify(interaction, verifyTemplateSchema, args);
  },
});

async function toggleVerify(
  interaction: GuildInteraction,
  verifyTemplateSchema: (Document & IVerifyTemplate) | null,
) {
  const embed = new EmbedBuilder().setColor("Blurple");

  if (!verifyTemplateSchema) {
    embed
      .setColor("Red")
      .setDescription(
        `No verified template found, configure verified template in \`/configure-verify set\` first`,
      );
    return interaction.editReply({
      embeds: [embed],
    });
  }

  verifyTemplateSchema.verificationEnabled =
    !verifyTemplateSchema.verificationEnabled;
  await verifyTemplateSchema.save();

  const state = verifyTemplateSchema.verificationEnabled ? "On" : "Off";
  embed.setDescription(`Set verification: "${state}"`);
  interaction.editReply({
    embeds: [embed],
  });
}

async function setVerify(
  interaction: GuildInteraction,
  verifyTemplateSchema: (Document & IVerifyTemplate) | null,
  args: CommandInteractionOptionResolver,
) {
  if (!verifyTemplateSchema)
    verifyTemplateSchema = new VerifyTemplateSchema({
      guildId: interaction.guild?.id,
    });

  const message = args.getString("verification-message")!;
  const channel = args.getChannel("verification-channel")! as GuildBasedChannel;
  const role = args.getRole("verified-role")!;

  const verifyEmbed = new EmbedBuilder().setColor("Blurple");

  if (!channel.isTextBased()) {
    verifyEmbed
      .setDescription(
        "Cannot send the verify embed in a non-text-based channel...",
      )
      .setColor("Red");
    return interaction.editReply({
      embeds: [verifyEmbed],
    });
  }

  verifyTemplateSchema.verifiedRole = role.id;
  await verifyTemplateSchema.save();

  verifyEmbed
    .setDescription(
      `${message}\n\nEnter \`${config.command.secondaryPrefix} verify\` to verify yourself...`,
    )
    .addFields({
      name: "How to verify?",
      value: `Enter the command \`${config.command.secondaryPrefix} verify\` to verify`,
    });

  await channel.send({
    embeds: [verifyEmbed],
  });

  const successEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setDescription(`Successfully posted verification embed in ${channel}`);
  interaction.editReply({
    embeds: [successEmbed],
  });
}
