import { client } from "../main";
import { TXEvent } from "../structures/TXEvent";
import config from "../../.../../txconfig.json"
import { ActivityType } from "discord.js";

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
