/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { GuildMember } from "discord.js";

export const PLACEHOLDERS: Record<string, string> = {
  "{{new_user}}": "The user that joined",
  "{{guild_name}}": "The server name",
  "{{username}}": "The username of the user",
  "{{user_tag}}": "The user's tag",
  "{{user_id}}": "The user's ID",
  "{{member_count}}": "The server's member count",
  "{{server_id}}": "The server's ID",
  "{{created_at}}": "When the user's account was created",
  "{{joined_at}}": "When the user joined the server",
  "{{display_name}}": "The member's display name in the server",
  "{{server_owner}}": "The server owner's mention",
  "{{role_count}}": "Number of roles in the server",
  "{{channel_count}}": "Number of channels in the server",
  "{{server_created}}": "When the server was created",
  "{{boost_level}}": "The server's boost level",
  "{{boost_count}}": "Number of server boosts",
  "{{verification_level}}": "The server's verification level",
  "{{user_discriminator}}": "The user's discriminator",
};

export const getMentionablesMap = (member: GuildMember): Record<string, string> => ({
  "{{new_user}}": member.user.toString(),
  "{{guild_name}}": member.guild.name,
  "{{username}}": member.user.username,
  "{{user_tag}}": member.user.tag,
  "{{user_id}}": member.user.id,
  "{{member_count}}": member.guild.memberCount.toString(),
  "{{server_id}}": member.guild.id,
  "{{created_at}}": member.user.createdAt.toLocaleDateString(),
  "{{joined_at}}": member.joinedAt?.toLocaleDateString() || "Unknown",
  "{{display_name}}": member.displayName,
  "{{server_owner}}": member.guild.ownerId ? `<@${member.guild.ownerId}>` : "Unknown",
  "{{role_count}}": member.guild.roles.cache.size.toString(),
  "{{channel_count}}": member.guild.channels.cache.size.toString(),
  "{{server_created}}": member.guild.createdAt.toLocaleDateString(),
  "{{boost_level}}": member.guild.premiumTier.toString(),
  "{{boost_count}}": (member.guild.premiumSubscriptionCount || 0).toString(),
  "{{verification_level}}": member.guild.verificationLevel.toString(),
  "{{user_discriminator}}": member.user.discriminator,
});

export const parseMessage = (template: string, mentionables: Record<string, string>) => {
  let result = template;
  for (const key in mentionables) result = result.replaceAll(key, mentionables[key]);
  return result;
};
