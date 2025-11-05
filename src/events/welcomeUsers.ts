/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../main";
import { TXEvent } from "../structures/TXEvent";
import GuildConfigs from "../database/models/GuildConfigs";
import { getMentionablesMap, parseMessage } from "../constants/mentionableMap";
import { EmbedBuilder } from "discord.js";

export default new TXEvent("guildMemberAdd", async (member) => {
  if (member.id === client.user?.id) return;

  let guildConfig = await GuildConfigs.findOne({ guildId: member.guild.id });
  if (!guildConfig)
    guildConfig = new GuildConfigs({ guildId: member.guild.id });

  guildConfig.save()

  if(!guildConfig.welcomeMessageToggle) return

  const mentionables = getMentionablesMap(member);
  const message = parseMessage(guildConfig.welcomeMessage, mentionables);
  const title = parseMessage(guildConfig.welcomeTitle, mentionables);

  const embed = new EmbedBuilder().setColor("Blurple").setTitle(title).setDescription(message)

  const channel = member.guild.channels.cache.get(guildConfig.welcomeChannel) || member.guild.systemChannel;
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
});
