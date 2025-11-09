/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import TXCommand from "../../../structures/TXCommand";
import VerifyTemplateSchema from "../../../database/models/VerifyTemplateSchema";
import { GuildMember } from "discord.js";

export default new TXCommand({
  name: "verify",
  description: "Verify yourself",
  syntax: "verify",

  execute: async ({ message, args }) => {
    const verifyTemplateSchema = await VerifyTemplateSchema.findOne({
      guildId: message.guild?.id,
    });

    if (!verifyTemplateSchema)
      return message.reply({
        content: "This guild haven't setup any verification system yet",
      });

    if (!verifyTemplateSchema.verificationEnabled)
      return message.reply({
        content: "This server disabled verification system",
      });

    const role = await message.guild?.roles.fetch(
      verifyTemplateSchema.verifiedRole,
    );

    if (!role)
      return message.reply({
        content: `Role with an ID of "${verifyTemplateSchema.verifiedRole}" was not found (possibly verified role)`,
      });

    const member = message.member as GuildMember;

    if (member.roles.cache.has(role.id))
      return message.reply({
        content: "You are already verified",
      });

    await member.roles.add(role);
    const reply = await message.reply(`You're now verified, ${member}`);
    await message.delete();
    setTimeout(() => {
      reply.delete();
    }, 10_000);
  },
});
