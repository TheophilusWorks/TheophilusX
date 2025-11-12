/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../../main";
import { TXEvent } from "../../structures/TXEvent";
import { ActivityType } from "discord.js";
import config from "../../../txconfig.json"

const TYPE_MAP: Record<string, ActivityType> = {
  PLAYING: ActivityType.Playing,
  COMPETING: ActivityType.Competing,
  WATCHING: ActivityType.Watching,
  LISTENING: ActivityType.Listening,
  CUSTOM: ActivityType.Custom,
  STREAMING: ActivityType.Streaming
}

export default new TXEvent("clientReady", ()=>{
  client.user?.setPresence({
    activities: [
      {
        name: config.botStatus.message,
        type: TYPE_MAP[config.botStatus.type?.toUpperCase() || "PLAYING"] as ActivityType
      }
    ],
    status: "online"
  })
})
