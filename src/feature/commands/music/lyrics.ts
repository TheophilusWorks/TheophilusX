import TXCommand from "../../../core/command/TXCommand.js";
import axios from "axios";
import { Emoji } from "../../constants/emojis.js";

interface TXLyricsResult {
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  plainLyrics: string;
  syncedLyrics: string;
}

export default new TXCommand({
  name: "lyrics",
  description: "Fetches the lyrics of a song",
  usage:
    "lyrics <song name> {--artist=<artist name>, --album=<album name>} {--synced}",
  minimumArguments: 1,
  cooldown: 15_000, // lyrics is spammy
  minimumGroupedArguments: 0,
  usedStringFlags: ["artist", "album"],
  usedBooleanFlags: ["synced"],
  minimumMentions: 0,
  execute: async (ctx, { adapter, args, stringFlags, booleanFlags }) => {
    await adapter.reactEmoji(ctx, Emoji.Loading)

    const query = args.join(" ");
    const artist = stringFlags?.["artist"];
    const album = stringFlags?.["album"];
    const isSynced = booleanFlags?.["synced"] ?? false;

    let url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(query)}`;
    if (artist) url += `&artist_name=${encodeURIComponent(artist)}`;
    if (album) url += `&album_name=${encodeURIComponent(album)}`;

    const { data } = await axios.get(url);
    const raw: TXLyricsResult[] = data;

    if (!raw.length) {
      await adapter.reply(ctx, "No lyrics found for your query.");
      return;
    }

    const results = dedupeAndSort(raw, query);

    if (!results.length) {
      await adapter.reply(ctx, "No usable results found after filtering.");
      return;
    }

    // auto-display if there's only one result, or if the top result is a very close match
    if (results.length === 1) {
      await adapter.reply(ctx, formattedLyrics(results[0], isSynced));
      return;
    }

    const formatted = formatLyricsResult(results, query);
    const choice = await adapter.reply(ctx, formatted);

    const index = await choice.waitReply({
      timeout: 120_000,
      filter: (msg) => msg.author.id === ctx.author.id,
    });

    if (!index) return;

    const idx = parseInt(index.context.content.trim());

    if (isNaN(idx) || idx < 1 || idx > Math.min(results.length, 5)) {
      await adapter.reply(
        ctx,
        `Invalid index. Please choose a number between 1 and ${Math.min(results.length, 5)}.`,
      );
      return;
    }

    const lyrics = results[idx - 1];
    await adapter.reactEmoji(ctx, Emoji.Done)
    await adapter.reply(ctx, formattedLyrics(lyrics, isSynced));
  },
});

function scoreResult(result: TXLyricsResult, query: string): number {
  const q = query.toLowerCase();
  const track = result.trackName?.toLowerCase() ?? "";
  const artist = result.artistName?.toLowerCase() ?? "";

  let score = 0;

  // Closest name match (highest weight)
  if (track === q) score += 40;
  else if (track.startsWith(q)) score += 25;
  else if (track.includes(q)) score += 15;
  else if (artist.includes(q)) score += 5;

  // Has plain lyrics
  if (result.plainLyrics?.trim()) score += 10;

  // Has synced lyrics
  if (result.syncedLyrics?.trim()) score += 6;

  // Has album info
  if (result.albumName?.trim()) score += 2;

  return score;
}

function dedupeAndSort(
  results: TXLyricsResult[],
  query: string,
): TXLyricsResult[] {
  const seen = new Map<string, TXLyricsResult>();

  for (const r of results) {
    const key = `${r.trackName?.toLowerCase()}||${r.artistName?.toLowerCase()}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, r);
    } else {
      const existingScore = scoreResult(existing, query);
      const newScore = scoreResult(r, query);
      if (newScore > existingScore) seen.set(key, r);
    }
  }

  return [...seen.values()].sort(
    (a, b) => scoreResult(b, query) - scoreResult(a, query),
  );
}

function formatLyricsResult(results: TXLyricsResult[], query: string): string {
  const top = results.slice(0, 5);

  const formatted = top
    .map((v, i) => {
      const hasLyrics = v.plainLyrics?.trim() || v.syncedLyrics?.trim();
      const lyricsBadge = v.syncedLyrics?.trim()
        ? "🟢"
        : v.plainLyrics?.trim()
          ? "🟡"
          : "🔴";
      return `┊ ${i + 1}: 🎵 ${v.trackName}\n┊   👤 ${v.artistName}\n┊   ${lyricsBadge} ${v.syncedLyrics?.trim() ? "Synced" : v.plainLyrics?.trim() ? "Plain" : "No lyrics"}`;
    })
    .join("\n├───────────────\n");

  return `‗   ↳ ❝ [ Search Results ] ¡! ❞
ೃ⁀➷ Found matches for "${query}".
Reply with the index number to see lyrics.

╭┈ results ̗̀➛
${formatted}
╰─────────┈➤`;
}

function formattedLyrics(lyrics: TXLyricsResult, isSynced: boolean): string {
  const body = isSynced
    ? lyrics.syncedLyrics?.trim() ||
      lyrics.plainLyrics?.trim() ||
      "_No lyrics available._"
    : lyrics.plainLyrics?.trim() ||
      lyrics.syncedLyrics?.trim() ||
      "_No lyrics available._";

  const lyricsType =
    isSynced && lyrics.syncedLyrics?.trim()
      ? "🟢 Synced"
      : lyrics.plainLyrics?.trim()
        ? "🟡 Plain"
        : "🔴 No lyrics";

  return `🎵 ${lyrics.trackName}
👤 ${lyrics.artistName}
💿 ${lyrics.albumName ?? "Unknown Album"}
${lyricsType}

${body}`;
}
