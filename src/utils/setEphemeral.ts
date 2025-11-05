/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { Message } from "discord.js"

export default async function setEphemeral(message: Message): Promise<void> {
  await message.react("🗑️")
  
  const originalAuthorId = message.reference?.messageId 
    ? (await message.channel.messages.fetch(message.reference.messageId)).author.id
    : message.author.id
  
  const filter = (reaction: any, user: any) => {
    return reaction.emoji.name === "🗑️" && user.id === originalAuthorId && !user.bot
  }
  
  const collector = message.createReactionCollector({ filter, max: 1 })
  
  collector.on("collect", async () => {
    await message.delete().catch(() => null)
  })
}
