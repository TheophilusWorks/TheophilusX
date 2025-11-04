/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { TXCommandType } from "../typings/Command";

export default class TXCommand {
  constructor(commandOptions: TXCommandType) {
    Object.assign(this, commandOptions);
  }
}
