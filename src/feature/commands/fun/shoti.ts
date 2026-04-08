import axios from "axios";
import TXCommand from "../../../core/command/TXCommand.js";
import { randomRange } from "../../../utils/randomRange.js";
import { getDirname } from "../../../utils/path.js";
import path from "node:path";
import { downloadFile } from "../../../utils/downloadFile.js";
import { unlink } from "node:fs/promises";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";

const __dirname = getDirname(import.meta.url);

export default new TXCommand({
  name: "shoti",
  description: "Sends a random shoti.",
  usage: "shoti",
  minimumArguments: 0,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context, args }) => {
    let response = await axios.get("https://tikwm.com/api/feed/search", {
      params: { keywords: "pinay shoti" },
    });

    const { data, status } = response;

    if (status !== 200) {
      throw new Error(`Cannot fetch shoti. HTTP status: ${status}`);
    }

    const videos = data?.data?.videos;

    if (!videos || videos.length === 0) {
      throw new Error("Failed to fetch shoti... Please try again later");
    }

    const rng = Math.floor(randomRange(0, videos.length));

    const video = videos[rng];

    const filepath = path.resolve(
      __dirname,
      `../../../../cache/shoti_${crypto.randomUUID()}.mp4`,
    );

    await downloadFile(video.play, filepath);
    await adapter.reply(context, {
      parts: [
        text("Here's your shoti, "),
        mention(context.author.id, context.author.displayName),
      ],
      attachments: [filepath],
    });

    await unlink(filepath);
  },
});
