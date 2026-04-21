import TXCommand from "../../../core/command/TXCommand.js";
import axios from "axios";
import { ensurePath } from "../../../utils/ensurePath.js";
import { getDirname } from "../../../utils/path.js";
import path from "node:path";
import crypto from "node:crypto";
import { downloadFile } from "../../../utils/downloadFile.js";

const __dirname = getDirname(import.meta.url);

type MusicItem = {
  id: string;
  title: string;
  artist: string;
};

export default new TXCommand({
  name: "music",
  description: "Queries a song on YT Music and sends it as a voice message",
  usage: "music <song name>",
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

    const LIMIT: number = Math.min(5, data.length);
    const videos: MusicItem[] = data.slice(0, LIMIT);

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
      __dirname,
      `../../../../cache/${safeName}_${crypto.randomUUID()}.mp3`,
    );

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
  },
});

function formatMusicResult(query: string, result: MusicItem[]): string {
  const formatted = result
    .map((v, i) => `┊ ${i + 1}: 🎵 ${v.title}\n┊   👤 ${v.artist}`)
    .join("\n├───────────────\n");

  return `
‗   ↳ ❝ [ Search Results ] ¡! ❞
ೃ⁀➷ Found matches for “${query}”.
Reply with the index number to download.

╭┈ results ̗̀➛
${formatted}
╰─────────┈➤
`;
}
