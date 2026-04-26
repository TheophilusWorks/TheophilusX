import TXCommand from "../../../core/command/TXCommand.js";
import Users from "../../../core/database/model/Users.js";
import instance from "../../../instance.js";

export default new TXCommand({
  name: "deduplicate",
  description: "Removes duplicate user entries, keeping the most recent",
  usage: "deduplicate",
  aliases: ["dedupe", "dedup"],
  minimumArguments: 0,
  minimumMentions: 0,
  cooldown: 0,
  minimumGroupedArguments: 0,
  execute: async (ctx, { adapter }) => {
    await adapter.reply(ctx, "Starting deduplication... Commands and events are now disabled.");
    instance.isMigrating(true);

    try {
      const users = await Users.find({}).lean();

      const grouped = new Map<string, typeof users>();

      for (const user of users) {
        const key = user.userId; 
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(user);
      }

      let deleted = 0;
      let clean = 0;
      const toDelete: string[] = [];

      for (const [, group] of grouped) {
        if (group.length <= 1) {
          clean++;
          continue;
        }

        group.sort((a, b) => {
          const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : Number(a.updatedAt ?? 0);
          const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : Number(b.updatedAt ?? 0);
          return bTime - aTime;
        });
        
        const dupes = group.slice(1);
        for (const dupe of dupes) {
          toDelete.push(dupe._id.toString());
          deleted++;
        }
      }

      if (toDelete.length > 0) {
        await Users.deleteMany({ _id: { $in: toDelete } });
      }

      await adapter.reply(
        ctx,
        `Deduplication complete.\n\n╭┈ results ̗̀➛\n┊ 🗑️ Deleted: ${deleted}\n┊ ✅ Clean: ${clean}\n┊ 📦 Total: ${users.length}\n╰─────────┈➤`,
      );
    } catch (err) {
      const e = err as Error;
      await adapter.reply(ctx, `Deduplication failed: ${e.message}`);
    } finally {
      instance.isMigrating(false);
      await adapter.reply(ctx, "Commands and events re-enabled.");
    }
  },
});
