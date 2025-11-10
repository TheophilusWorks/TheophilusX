/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { model, Schema } from "mongoose";

const embedSchema = new Schema({
  name: { type: String, required: true },
  title: { type: String, default: null },
  description: { type: String, default: null },
  color: { type: String, default: "#ffffff" },
  thumbnail: { type: String, default: null },
  image: { type: String, default: null },
  footer: { type: String, default: null },
  timestamp: { type: Boolean, default: false },
});

const guildConfigsSchema = new Schema({
  guildId: { type: String, required: true },
  welcomeChannel: { type: String, default: null },
  welcomeMessageToggle: { type: Boolean, default: true },
  welcomeTitle: { type: String, default: "Welcome home, {user.displayName}!" },
  welcomeMessage: { type: String, default: "Welcome to **{guild.name}**, {user}!" },
  goodbyeChannel: { type: String, default: null },
  goodbyeMessageToggle: { type: Boolean, default: true },
  goodbyeTitle: { type: String, default: "{user.displayName} left..." },
  goodbyeMessage: { type: String, default: "{user} left, current members {guild.memberCount}" },
  embeds: { type: [embedSchema], default: [] }, // store multiple named embeds
});

export default model("GuildConfigs", guildConfigsSchema);
