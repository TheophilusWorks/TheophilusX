/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../../main";
import { TXEvent } from "../../structures/TXEvent";
import GuildConfigs from "../../database/models/GuildConfigs";
import { EmbedBuilder } from "discord.js";
import TXVariable from "../../structures/TXVariables";
import { TXVariableParserContext } from "../../typings/Variables";

export default new TXEvent("guildMemberRemove", async (member) => {
  if (member.id === client.user?.id) return;

  let guildConfig = await GuildConfigs.findOne({ guildId: member.guild.id });
  if (!guildConfig)
    guildConfig = new GuildConfigs({ guildId: member.guild.id });

  guildConfig.save();

  if (!guildConfig.goodbyeMessageToggle) return;

  const context: TXVariableParserContext = {
    user: member.user,
    guild: member.guild,
  };

  const title = await new TXVariable().parse(guildConfig.goodbyeTitle, context);
  const message = await new TXVariable().parse(guildConfig.goodbyeMessage, context);

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle(title || null)
    .setDescription(message);

  const channel =
    member.guild.channels.cache.get(guildConfig.goodbyeChannel) ||
    member.guild.systemChannel;

  if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
});
