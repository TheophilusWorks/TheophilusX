/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import TXCommand from "../../../structures/TXCommand";
import { fetchUser } from "../../../utils/fetcher";
import Users from "../../../database/models/Users";
import setEphemeral from "../../../utils/setEphemeral";

export default new TXCommand({
  name: "balance",
  description: "Check your or someone's balance",
  syntax: "balance [user]",
  cooldown: 3000,
  serverOnly: true,
  execute: async ({ message, args }) => {
    const targetUser = (await fetchUser(args[0])) || message.author

    const query = {
      userId: targetUser.id,
      guildId: message.guild?.id
    }
    let user = await Users.findOne(query)
    if(!user) user = new Users(query)
    
    const reply = await message.reply(`**${targetUser.displayName}'s** balance is: **${user.balance}**`)
    await setEphemeral(reply)
  }
});
