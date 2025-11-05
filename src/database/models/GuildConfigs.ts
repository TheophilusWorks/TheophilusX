/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { model, Schema } from "mongoose";

const guildConfigsSchema = new Schema({
  guildId: {
    type: Number,
    required: true
  },
  welcomeChannel: {
    type: String,
    default: null
  },
  welcomeMessageToggle: {
    type: Boolean,
    default: true
  },
  welcomeTitle: {
    type: String,
    default: "Welcome home, {{user_name}}!"
  },
  welcomeMessage: {
    type: String,
    default: "Welcome to {{guild_name}}, {{new_user}}!"
  }
})

export default model("GuildConfigs", guildConfigsSchema)
