/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../../main";
import { TXEvent } from "../../structures/TXEvent";
import GuildConfigs from "../../database/models/GuildConfigs";
import { TXVariableParserContext } from "../../typings/Variables";
import buildEmbed from "../../utils/buildEmbed";

export default new TXEvent("guildMemberRemove", async (member) => {
  if (member.id === client.user?.id) return;

  const guildConfig = await GuildConfigs.findOne({ guildId: member.guild.id });

  if (!guildConfig || !guildConfig.goodbyeEmbed || !guildConfig.goodbyeToggle)
    return;

  const context: TXVariableParserContext = {
    user: member.user,
    guild: member.guild!,
  };
  const embed = await buildEmbed(guildConfig.goodbyeEmbed, context);
  if (!embed) return;
  const channelId = guildConfig.goodbyeChannel;

  const channel = member.guild.channels.cache.get(channelId);

  if (!channel || !channel.isTextBased()) return;

  channel.send({ embeds: [embed] });
});
