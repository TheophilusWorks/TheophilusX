import axios from "axios";
import TXCommand from "../../../core/command/TXCommand.js";
import { randomRange } from "../../../utils/randomRange.js";
import { getDirname } from "../../../utils/path.js";
import path from "node:path";
import { downloadFile } from "../../../utils/downloadFile.js";
import { unlink } from "node:fs/promises";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import { CACHE_DIR } from "../../../core/TheophilusX.js";

const __dirname = getDirname(import.meta.url);

export default new TXCommand({
  name: "shoti",
  description: "Sends a random shoti.",
  usage: "shoti",
  minimumArguments: 0,
  cooldown: 5_000,
  shopInfo: {
    price: 1000,
  },
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let response = await axios.get(
      "https://oreo.gleeze.com/api/shoti?stream=false",
    );

    const { data, status } = response;

    if (status !== 200) {
      throw new Error(`Cannot fetch shoti. HTTP status: ${status}`);
    }

    const filepath = path.resolve(
      CACHE_DIR,
      `shoti_${crypto.randomUUID()}.mp4`,
    );

    try {
      await downloadFile(data.link, filepath);
      await adapter.reply(ctx, {
        parts: [
          text("Here's your shoti, "),
          mention(ctx.author.id, ctx.author.displayName),
          text("! Enjoy!"),
          text("\n\n"),
          text(`Title: ${data.title}\n`),
          text(`Nickname: ${data.nickname}\n`),
          text(`Region: ${data.region}\n`),
        ],
        attachments: [filepath],
      });
    } finally {
      await unlink(filepath);
    }
  },
});
