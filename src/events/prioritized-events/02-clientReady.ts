/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../../main";
import { TXEvent } from "../../structures/TXEvent";
import { PrettyLogger as log, LogTag } from "../../utils/PrettyLogger";

export default new TXEvent("clientReady", () => {
  log.success({
    message: `${client.user?.username} is now ready`,
    tag: LogTag.READY,
  });
});
