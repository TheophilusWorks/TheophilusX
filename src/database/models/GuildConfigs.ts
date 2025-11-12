/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { model, Schema } from "mongoose";

const embedAuthorSchema = new Schema({
  name: { type: String, required: true },
  iconURL: { type: String, default: null },
  url: { type: String, default: null },
});

const embedSchema = new Schema({
  name: { type: String, required: true },
  title: { type: String, default: null },
  description: { type: String, default: null },
  url: { type: String, default: null },
  color: { type: String, default: "#ffffff" },
  thumbnail: { type: String, default: null },
  image: { type: String, default: null },
  footer: { type: String, default: null },
  footerIconURL: { type: String, default: null },
  timestamp: { type: Boolean, default: false },
  author: { type: embedAuthorSchema, default: null },
});

const guildConfigsSchema = new Schema({
  guildId: { type: String, required: true },
  welcomeChannel: { type: String, default: null },
  welcomeToggle: { type: Boolean, default: true },
  welcomeEmbed: embedSchema,
  goodbyeChannel: { type: String, default: null },
  goodbyeToggle: { type: Boolean, default: true },
  goodbyeEmbed: embedSchema,
  embeds: { type: [embedSchema], default: [] },
});

export default model("GuildConfigs", guildConfigsSchema);
