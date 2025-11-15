// setEphemeral.ts
/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { Message } from "discord.js"
import config from "../../txconfig.json"

export default async function setEphemeral(message: Message): Promise<void> {
  await message.react(config.misc.ephemeralEmoji)
}

// messageReactionAdd.ts
