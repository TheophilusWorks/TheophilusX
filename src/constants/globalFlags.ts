/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import config from "../../txconfig.json"
import { TXCommandType } from "../typings/Command"

export default (command: TXCommandType)=>{
  const flags = {
      syntax: `\`${config.command.secondaryPrefix}${command.syntax}\``,
      description: command.description,
  }
  return flags
}
