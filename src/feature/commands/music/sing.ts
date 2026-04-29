import TXCommand from "../../../core/command/TXCommand.js";
import axios from "axios";
import { ensurePath } from "../../../utils/ensurePath.js";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { CACHE_DIR } from "../../../core/TheophilusX.js";
import path from "node:path";
import { Emoji } from "../../constants/emojis.js";

type MusicItem = {
  id: string;
  title: string;
  artist: string;
  duration?: string;
};

function parseDurationSeconds(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

async function downloadMp3(url: string, dest: string): Promise<void> {
  const response = await axios.get(url, {
    responseType: "stream",
    maxRedirects: 10,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "audio/mpeg, audio/*, */*",
    },
  });

  const contentType: string = response.headers["content-type"] ?? "";
  if (contentType.includes("text/html")) {
    throw new Error(
      `Download URL returned HTML instead of audio (content-type: ${contentType})`,
    );
  }

  await new Promise<void>((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(dest))
      .on("finish", resolve)
      .on("error", reject);
  });

  const stat = await fsp.stat(dest);
  if (stat.size === 0) {
    throw new Error("Downloaded file is 0 bytes — download likely failed.");
  }
}

export default new TXCommand({
  name: "sing",
  description: "Queries a song on YT Music and sends it as a voice message",
  usage: "sing <song name>",
  minimumArguments: 1,
  cooldown: 25_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,

  execute: async (ctx, { adapter, args }) => {
    await adapter.reactEmoji(ctx, Emoji.Loading)
    const query: string = args.join(" ").trim();

    const { data: raw } = await axios.post(
      `https://www.techcover.fr/explore/${encodeURIComponent(query)}/`,
    );

    const data: MusicItem[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

    if (data.length === 0) {
      await adapter.reply(ctx, "No results found.");
      return;
    }

    const filtered = data.filter((item) => {
      if (!item.duration) return true;
      return parseDurationSeconds(item.duration) <= 600;
    });

    if (filtered.length === 0) {
      await adapter.reply(ctx, "No results found under 10 minutes.");
      return;
    }

    const LIMIT = Math.min(5, filtered.length);
    const videos = filtered.slice(0, LIMIT);
    const formatted = formatMusicResult(query, videos);
    const reply = await adapter.reply(ctx, formatted);

    const res = await reply.waitReply({
      timeout: 60_000,
      filter: (msg: any) => msg.author.id === ctx.author.id,
    });

    if (!res) return;

    const content: string = res.context.content;
    const idx = Number(content.trim()) - 1;

    if (!Number.isInteger(idx) || idx < 0 || idx >= videos.length) {
      await res.reply(`Invalid index. Choose between 1 and ${videos.length}.`);
      return;
    }

    const video = videos[idx];

    if (!video?.id) {
      await res.reply("Selected item is invalid.");
      return;
    }

    const link = `https://www.youtube.com/watch?v=${video.id}`;
    const safeName = query.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    const filepath = path.resolve(
      CACHE_DIR,
      `${safeName}_${crypto.randomUUID()}.mp3`,
    );

    await ensurePath(filepath);

    let filepath_created = false;
    try {
      const { data: dl }: { data: { download?: string } } = await axios.get(
        `https://ccproject.serv00.net/ytdl2.php?url=${encodeURIComponent(link)}`,
      );

      if (!dl?.download) {
        await res.reply("Download service failed.");
        return;
      }

      await downloadMp3(dl.download, filepath);
      filepath_created = true;

      await adapter.reactEmoji(ctx, Emoji.Done)
      await res.reply({ attachments: [filepath] });
    } catch (err) {
      await res.reply("Failed to download or send the song. Try again.");
      throw err;
    } finally {
      if (filepath_created) {
        await fsp.unlink(filepath).catch(() => {});
      }
    }
  },
});

function formatMusicResult(query: string, result: MusicItem[]): string {
  const formatted = result
    .map((v, i) => `┊ ${i + 1}: 🎵 ${v.title}\n┊   👤 ${v.artist}`)
    .join("\n├───────────────\n");

  return `
‗   ↳ ❝ [ Search Results ] ¡! ❞
ೃ⁀➷ Found matches for "${query}".
Reply with the index number to download.

╭┈ results ̗̀➛
${formatted}
╰─────────┈➤
`;
}
