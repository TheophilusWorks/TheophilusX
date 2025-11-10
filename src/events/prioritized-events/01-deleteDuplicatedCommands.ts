/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../../main";
import { TXEvent } from "../../structures/TXEvent";

export default new TXEvent("clientReady", async () => {
  await client.detectAndRemoveDuplicates();

  const guildId = process.env.GUILD_ID;
  if (guildId) {
    await client.detectAndRemoveDuplicates(guildId);
  }
});
