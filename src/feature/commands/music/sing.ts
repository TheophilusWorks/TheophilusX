import TXCommand from "../../../core/command/TXCommand.js";
import axios from "axios";
import { ensurePath } from "../../../utils/ensurePath.js";
import crypto from "node:crypto";
import { downloadFile } from "../../../utils/downloadFile.js";
import fs from "node:fs/promises";
import { CACHE_DIR } from "../../../core/TheophilusX.js";
import path from "node:path";

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

export default new TXCommand({
  name: "sing",
  description: "Queries a song on YT Music and sends it as a voice message",
  usage: "sing <song name>",
  minimumArguments: 1,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,

  execute: async (ctx, { adapter, args }) => {
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

    const LIMIT: number = Math.min(5, filtered.length);
    const videos: MusicItem[] = filtered.slice(0, LIMIT);

    const formatted = formatMusicResult(query, videos);

    const reply = await adapter.reply(ctx, formatted);

    const res = await reply.waitReply({
      timeout: 60_000,
      filter: (msg: any) => msg.author.id === ctx.author.id,
    });

    if (!res) return;

    const content: string = res.context.content;
    const idx: number = Number(content.trim()) - 1;

    if (!Number.isInteger(idx) || idx < 0 || idx >= videos.length) {
      await res.reply(`Invalid index. Choose between 1 and ${videos.length}.`);
      return;
    }

    const video: MusicItem = videos[idx];

    if (!video?.id) {
      await res.reply("Selected item is invalid.");
      return;
    }

    const link: string = `https://www.youtube.com/watch?v=${video.id}`;

    const safeName: string = query.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    const filepath: string = path.resolve(
      CACHE_DIR,
      `${safeName}_${crypto.randomUUID()}.mp3`,
    );

    try {
      await ensurePath(filepath);

      const { data: dl }: { data: { download?: string } } = await axios.get(
        `https://ccproject.serv00.net/ytdl2.php?url=${encodeURIComponent(link)}`,
      );

      if (!dl?.download) {
        await res.reply("Download service failed.");
        return;
      }

      await downloadFile(dl.download, filepath);

      await res.reply({
        attachments: [filepath],
      });
    } finally {
      await fs.unlink(filepath);
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
