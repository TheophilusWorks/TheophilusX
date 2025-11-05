/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { Schema, model } from "mongoose";

const usersSchema = new Schema({
  guildId: {
    type: Number,
    required: true,
  },
  userId: {
    type: Number,
    required: true
  },
  lastDaily: {
    type: Date,
    default: null,
  },
  balance: {
    type: Number,
    default: 0
  }
})

export default model("Users", usersSchema)
