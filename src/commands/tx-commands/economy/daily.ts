/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import TXCommand from "../../../structures/TXCommand";
import { EmbedBuilder } from "discord.js";
import Users from "../../../database/models/Users";
import getRandomRange from "../../../utils/getRandomRange";
import setEphemeral from "../../../utils/setEphemeral";
import prettyms from "pretty-ms";

export default new TXCommand({
  name: "daily",
  description: "Claim your daily reward",
  syntax: "daily",
  cooldown: 3000,
  serverOnly: true,
  execute: async ({ message }) => {
    const query = {
      userId: message.author.id,
      guildId: message.guild?.id
    }
    
    let user = await Users.findOne(query)
    if (!user) user = new Users(query)
    
    const now = new Date()
    const lastDaily = user.lastDaily ? new Date(user.lastDaily) : null
    
    if (lastDaily) {
      const timeDiff = now.getTime() - lastDaily.getTime()
      const hoursDiff = timeDiff / (1000 * 60 * 60)
      
      if (hoursDiff < 24) {
        const timeLeft = (24 * 60 * 60 * 1000) - timeDiff
        
        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle("Daily Already Claimed")
          .setDescription(`You've already claimed your daily reward!\n\nCome back in **${prettyms(timeLeft)}**`)
          .setTimestamp()
        
        const reply = await message.reply({ embeds: [embed] })
        return setEphemeral(reply)
      }
    }
    
    const reward = getRandomRange(200, 1000)
    user.balance += reward
    user.lastDaily = now
    await user.save()
    
    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("Daily Reward Claimed")
      .setDescription(`You claimed your daily reward and received **${reward}** coins!\n\nYour new balance: **${user.balance}** coins`)
      .setTimestamp()
    
    const reply = await message.reply({ embeds: [embed] })
    await setEphemeral(reply)
  }
})
