import { client } from "../main";
import { TXEvent } from "../structures/TXEvent";
import config from "../../txconfig.json";
import { GuildMessage } from "../typings/Command";

export default new TXEvent("messageCreate", async(message)=>{
  if(message.author.bot) return
  if(!message.content.startsWith(config.secondaryPrefix)) return
  if(!message.guild || !message.member) return

  const prefix = config.secondaryPrefix
  const msg = message.content.slice(prefix.length)
  const tokens: string[] = msg.trim().split(/ +/)

  const commandName = tokens[0]
  const args = tokens.slice(1)

  if(!commandName) return

  const commandObject = client.txCommands.find((cmd) => cmd.name === commandName)

  if(!commandObject) return

  commandObject.execute({
    message: message as GuildMessage,
    client,
    args
  })
})
