/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import TXCommand from "../../../structures/TXCommand"
import { fetchMember } from "../../../utils/fetcher"
import { EmbedBuilder } from "discord.js"

export default new TXCommand({
  name: "userinfo",
  description: "Inspect user information",
  syntax: "userinfo [user]",
  serverOnly: true,
  cooldown: 10000,
  execute: async({ message, args })=>{
    const member = (await fetchMember(args[0])) || message.member
    
    if (!member) {
      return message.reply("Unable to find that user.")
    }

    const user = member.user
    const highestRole = member.roles.highest.id !== message.guild?.id 
      ? `<@&${member.roles.highest.id}>`
      : "None"

    const fields = [
      { name: "ID", value: user.id, inline: true },
      { name: "Username", value: user.username, inline: true },
      { name: "Nickname", value: member.nickname || "None", inline: true },
      { name: "Timeout", value: member.communicationDisabledUntilTimestamp ? `<t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}:R>` : "None", inline: true },
      { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
      { name: "Global Name", value: user.globalName || "None", inline: true },
      { name: "Avatar", value: `[Link](${user.displayAvatarURL({ size: 512 })})`, inline: true },
      { name: "Created Account", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "Joined Server", value: `<t:${Math.floor((member.joinedTimestamp || 0) / 1000)}:R>`, inline: true },
      { name: "Highest Role", value: highestRole, inline: true }
    ]

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor || "Blurple")
      .setAuthor({ 
        name: `${user.username}${user.discriminator !== "0" ? `#${user.discriminator}` : ""}`,
        iconURL: user.displayAvatarURL()
      })
      .setThumbnail(user.displayAvatarURL())
      .addFields(fields)
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  }
})
