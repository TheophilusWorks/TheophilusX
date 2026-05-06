import TXCommand from "../../../core/command/TXCommand.js";
import { userCache } from "../../../adapters/facebookAdapter.cjs";
import v8 from "node:v8";

type MemorySnapshot = {
  rss: number;
  heapUsed: number;
  external: number;
  cache: number;
  time: number;
};

type MemoryDelta = {
  rss: number;
  heap: number;
  external: number;
  cache: number;
  dt: number;
};

let lastSnapshot: MemorySnapshot | null = null;

export default new TXCommand({
  name: "memory",
  description: "Memory profiler",
  usage: "memory",
  aliases: ["mem"],
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 10_000,
  minimumMentions: 0,

  execute: async (ctx, { adapter }) => {
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();

    const snapshot: MemorySnapshot = {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      external: mem.external,
      cache: userCache?.size ?? 0,
      time: Date.now(),
    };

    const fmt = (n: number) => (n / 1024 / 1024).toFixed(2);

    let delta: MemoryDelta | null = null;

    if (lastSnapshot) {
      delta = {
        rss: snapshot.rss - lastSnapshot.rss,
        heap: snapshot.heapUsed - lastSnapshot.heapUsed,
        external: snapshot.external - lastSnapshot.external,
        cache: snapshot.cache - lastSnapshot.cache,
        dt: snapshot.time - lastSnapshot.time,
      };
    }

    lastSnapshot = snapshot;

    let hint = "Stable";

    if (delta) {
      if (delta.heap > 10 * 1024 * 1024) hint = "⚠️ Heap growing fast";
      if (delta.external > 10 * 1024 * 1024) hint = "⚠️ External memory growth";
      if (delta.cache > 200) hint = "⚠️ Cache expanding";
      if (delta.rss > 20 * 1024 * 1024) hint = "⚠️ RSS growth detected";
    }

    const output = `
ᵎᵎ  theophilusx   𔔁

  ⌖ memory
     RSS      ${fmt(mem.rss)} MB ${delta ? `(${fmt(delta.rss)} B)` : ""}
     Heap     ${fmt(mem.heapUsed)} MB ${delta ? `(${fmt(delta.heap)} B)` : ""}
     Ext      ${fmt(mem.external)} MB ${delta ? `(${fmt(delta.external)} B)` : ""}

  ⌖ user cache      ${snapshot.cache} ${delta ? `(${delta.cache >= 0 ? "+" : ""}${delta.cache})` : ""}
  ⌖ heap limit ${Math.round(heap.heap_size_limit / 1024 / 1024)} MB

  ⦇ status ─┄ ${hint}
`;

    await adapter.reply(ctx, output.trim());
  },
});
