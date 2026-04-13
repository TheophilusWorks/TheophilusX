import axios from "axios";
import TXCommand from "../../../core/command/TXCommand.js";
import { getDirname } from "../../../utils/path.js";
import path from "node:path";
import { downloadFile } from "../../../utils/downloadFile.js";
import fs from "fs/promises";

const __dirname = getDirname(import.meta.url);
const headers: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9," +
    "image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  Referer: "https://translate.google.com/",
  Origin: "https://translate.google.com",
};

export default new TXCommand({
  name: "say",
  description: "Sends a TTS message",
  usage: "joke {--lang=<language>}",
  minimumArguments: 0,
  cooldown: 5_000,
  aliases: ["tts", "talk"],
  minimumGroupedArguments: 0,
  usedBooleanFlags: ["list-categories"],
  usedStringFlags: ["category"],
  minimumMentions: 0,
  execute: async ({ adapter, context, stringFlags, args }) => {
    let msg = args.join(" ");
    let language = stringFlags?.["lang"]
      ? stringFlags["lang"].toLowerCase()
      : "en";

    let filepath = path.resolve(
      __dirname,
      `../../../../cache/say_${crypto.randomUUID()}.mp3`,
    );
    await downloadFile(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(msg)}&tl=${language}&client=tw-ob`,
      filepath,
      headers,
    );
    await adapter.reply(context, {
      attachments: [filepath],
    });
    await fs.unlink(filepath);
  },
});
