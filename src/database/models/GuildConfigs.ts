/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { model, Schema, Document } from "mongoose";

export interface IEmbedAuthor {
  name: string;
  iconURL?: string | null;
  url?: string | null;
}

export interface IEmbed {
  name: string;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  color: string;
  thumbnail?: string | null;
  image?: string | null;
  footer?: string | null;
  footerIconURL?: string | null;
  timestamp: boolean;
  author?: IEmbedAuthor | null;
}

export interface IGuildConfigs extends Document {
  guildId: string;

  welcomeChannelId: string;
  welcomeEmbedIsEnabled: boolean;
  welcomeMessage: string | null;
  welcomeEmbeds: IEmbed[];

  goodbyeChannelId: string;
  goodbyeEmbedIsEnabled: boolean;
  goodbyeMessage: string | null;
  goodbyeEmbeds: IEmbed[];

  verifyEmbeds: IEmbed[];
  verifyRole: string;
  verifyChannel: string;

  embeds: IEmbed[];
}

const embedAuthorSchema = new Schema<IEmbedAuthor>(
  {
    name: { type: String, required: true },
    iconURL: { type: String, default: null },
    url: { type: String, default: null },
  },
  { _id: false },
);

const embedSchema = new Schema<IEmbed>(
  {
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
  },
  { _id: false },
);

const guildConfigsSchema = new Schema<IGuildConfigs>({
  guildId: { type: String, required: true },

  welcomeChannelId: { type: String, default: null },
  welcomeEmbedIsEnabled: { type: Boolean, default: true },
  welcomeMessage: { type: String, default: null },
  welcomeEmbeds: [embedSchema],

  goodbyeChannelId: { type: String, default: null },
  goodbyeEmbedIsEnabled: { type: Boolean, default: true },
  goodbyeMessage: { type: String, default: null },
  goodbyeEmbeds: [embedSchema],

  verifyEmbeds: { type: [embedSchema], default: [] },
  verifyRole: { type: String, default: null },
  verifyChannel: { type: String, default: null },

  embeds: { type: [embedSchema], default: [] },
});

export default model("GuildConfigs", guildConfigsSchema);
