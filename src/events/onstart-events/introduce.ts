/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { EmbedBuilder, TextChannel, ChannelType } from "discord.js"
import { TXEvent } from "../../structures/TXEvent"
import config from '../../../txconfig.json'


export default new TXEvent("guildCreate", (guild) => {
  const client = guild.client
  const INTRODUCTION = `
👋 Hello, @everyone! Thanks for inviting me!

**I’m ${client.user?.username}!**

I’m a multipurpose Discord bot designed to make your server fun and organized.

**Features:**
- **Moderation:** Kick, ban, timeout, and more.
- **Fun:** Games, memes, and random commands.
- **Utility:** User info, server info, ping, and more.

Type \`tx> help\` to see all my commands and get started!

Hope we have a great time together! 🚀
`

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setDescription(INTRODUCTION)
    .addFields({
      name: "Prefixes",
      value: `[ \`${config.command.secondaryPrefix}\`, \`/\` ]`
    })

  const channel = guild.systemChannel
    || guild.channels.cache.find(
      (ch): ch is TextChannel =>
        ch.type === ChannelType.GuildText &&
        ch.permissionsFor(guild.members.me!).has("SendMessages")
    )

  if (!channel) return

  channel.send({ embeds: [embed] })
})
