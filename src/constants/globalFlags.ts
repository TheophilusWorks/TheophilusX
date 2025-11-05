/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { secondaryPrefix as prefix } from "../../txconfig.json"
import { TXCommandType } from "../typings/Command"

export default (command: TXCommandType)=>{
  const flags = {
      syntax: `\`${prefix}${command.syntax}\``,
      description: command.description,
  }
  return flags
}
