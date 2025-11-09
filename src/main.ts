/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import "dotenv/config"
import { logTX } from "./utils/logTX"
import TheophilusX from "./structures/TheophilusX";
import TXDatabase from "./structures/TXDatabase";
import Web from "./web"

export const database = new TXDatabase()
export const client = new TheophilusX()

const main = async()=>{
  logTX()
  await database.initialize()
  await client.instantiate()
  Web()
}

main()
