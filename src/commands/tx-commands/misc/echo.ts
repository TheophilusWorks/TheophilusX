/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import TXCommand from "../../../structures/TXCommand";
import config from "../../../../txconfig.json"

export default new TXCommand({
  name: "echo",
  description: "Echoes your message",
  syntax: "echo <message>",
  cooldown: 5000,
  execute: async ({ message, args })=>{
    if(args.length <= 0) return message.reply(`No message specified, type \`${config.secondaryPrefix}help echo\` for more info...`)

    const msg = args.join(" ")

    message.reply(msg)
  }
})
