import axios from "axios";
import crypto from "node:crypto";
import TXCommand from "../../../core/command/TXCommand.js";
import { text } from "../../../core/message/TXMessageBuilder.js";
import { downloadFile } from "../../../utils/downloadFile.js";
import { CACHE_DIR } from "../../../core/TheophilusX.js";
import path from "node:path";
import fs from "fs/promises";

export default new TXCommand({
  name: "screenshot",
  description: "Take a photo of a website",
  usage: "screenshot <URL>",
  minimumArguments: 1,
  aliases: ["ss"],
  cooldown: 10_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    const url = args.join(" ");

    const { data: res } = await axios.get(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=false&deviceScaleFactor=3&screenshot.type=png&screenshot.fullPage=true&viewport.width=2560&viewport.height=1440&adblock=true&force=false`,
    );

    const data = res.data;

    const filepath = path.resolve(
      CACHE_DIR,
      `ss_${crypto.randomUUID()}.${data.screenshot.type}`,
    );

    try {
      await downloadFile(data.screenshot.url, filepath);
      await adapter.reply(ctx, {
        parts: [
          text(`
‗   ↳ ❝ [ Screenshot ] ¡! ❞
ೃ⁀➷ Here is your screenshot 
         ◇─◇───◇─◇

╭┈ info : ̗̀➛
┊ 🔗 URL: ${data.url}
┊ 📦 Image size: ${data.screenshot.size_pretty}
┊ 📐 Image ratio: ${data.screenshot.width}:${data.screenshot.height}
┊ 🖼️ Image type: .${data.screenshot.type}
╰─────────┈➤

𓆩⟡𓆪 Cool website!
`),
        ],
        attachments: [filepath],
      });
    } finally {
      await fs.unlink(filepath).catch(() => {});
    }
  },
});
