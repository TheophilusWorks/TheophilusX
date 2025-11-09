/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { model, Schema, Document } from "mongoose"

export interface IVerifyTemplate extends Document {
  guildId: string;
  verificationEnabled: boolean,
  verifiedRole: string;
}

const verifyTemplateSchema = new Schema<IVerifyTemplate>({
  guildId: { type: String, required: true },
  verificationEnabled: { type: Boolean, default: false },
  verifiedRole: { type: String, default: null },
});

export default model<IVerifyTemplate>("VerifyTemplate", verifyTemplateSchema);
