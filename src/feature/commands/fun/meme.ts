import axios from "axios";
import TXCommand from "../../../core/command/TXCommand.js";
import { text } from "../../../core/message/TXMessageBuilder.js";
import path from "node:path";
import { getDirname } from "../../../utils/path.js";
import fs from "fs/promises";
import { downloadFile } from "../../../utils/downloadFile.js";

const __dirname = getDirname(import.meta.url);

export default new TXCommand({
  name: "meme",
  description: "Sends a meme from a random subreddit",
  usage: "meme {--subreddit=<subreddit name>}",
  usedStringFlags: ["subreddit"],
  minimumArguments: 0,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context, args, stringFlags }) => {
    let subreddit = stringFlags?.["subreddit"] || "";
    let data: Record<string, unknown>;

    if (subreddit) {
      let temp = await axios.get(
        `https://meme-api.com/gimme/${encodeURI(subreddit)}/1`,
      );
      data = temp.data.memes[0];
    } else {
      let temp = await axios.get(`https://meme-api.com/gimme`);
      data = temp.data;
    }

    let { title, url, author, postLink } = data;
    let extension = (url as string).split(".").at(-1);
    let meme = `
╭┈────── ${data.subreddit}
╰┈➤ ❝ [ ${author} ]
⋆·˚ ༘ Title:  ${title}
─────────────────────────
Post link: ${postLink}
`.trim();

    let filepath = path.resolve(
      __dirname,
      `../../../../cache/meme_${crypto.randomUUID()}.${extension}`,
    );
    await downloadFile(url as string, filepath);
    await adapter.reply(context, {
      parts: [text(meme)],
      attachments: [filepath],
    });
    await fs.unlink(filepath);
  },
});
