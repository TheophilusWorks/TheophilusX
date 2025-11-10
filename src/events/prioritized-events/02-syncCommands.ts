/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../../main";
import { TXEvent } from "../../structures/TXEvent";

export default new TXEvent("clientReady", async () => {
  const commands = Array.from(client.commands.values());
  
  await client.syncCommands({ commands });

  const guildId = process.env.GUILD_ID;
  if (guildId) {
    const privateCommands = commands.filter(cmd => (cmd as any).private);
    if (privateCommands.length > 0) {
      await client.syncCommands({ 
        commands: privateCommands, 
        guildId 
      });
    }
  }
});
