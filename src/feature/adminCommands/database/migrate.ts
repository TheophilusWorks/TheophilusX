import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  initializeUserEconomy,
  initializeUserInventory,
} from "../../../core/database/model/Users.js";
import instance from "../../../instance.js";

export default new TXCommand({
  name: "migrate",
  description: "Migrates all users to the latest schema",
  usage: "migrate",
  minimumArguments: 0,
  minimumMentions: 0,
  cooldown: 0,
  minimumGroupedArguments: 0,
  execute: async (ctx, { adapter }) => {
    await adapter.reply(
      ctx,
      "Starting migration... Commands and events are now disabled.",
    );
    instance.isMigrating(true);

    try {
      const users = await Users.find({}).lean();
      const defaultEconomy = initializeUserEconomy();
      const defaultInventory = initializeUserInventory();
      let migrated = 0;
      let skipped = 0;

      for (const user of users) {
        const updates: Record<string, any> = {};

        // migrate economy
        for (const [key, defaultValue] of Object.entries(defaultEconomy)) {
          const current = (user.economy as any)?.[key];

          if (current instanceof Date) {
            updates[`economy.${key}`] = current.getTime();
          } else if (current == null) {
            updates[`economy.${key}`] = defaultValue;
          }
        }

        // migrate inventory
        for (const [key, defaultValue] of Object.entries(defaultInventory)) {
          const current = (user.inventory as any)?.[key];
          if (current == null) {
            updates[`inventory.${key}`] = defaultValue;
          }
        }

        if (Object.keys(updates).length === 0) {
          skipped++;
          continue;
        }

        await Users.updateOne({ _id: user._id }, { $set: updates });
        migrated++;
      }

      await adapter.reply(
        ctx,
        `Migration complete.\n\n╭┈ results ̗̀➛\n┊ ✅ Migrated: ${migrated}\n┊ ⏭️ Skipped: ${skipped}\n┊ 📦 Total: ${users.length}\n╰─────────┈➤`,
      );
    } catch (err) {
      const e = err as Error;
      await adapter.reply(ctx, `Migration failed: ${e.message}`);
    } finally {
      instance.isMigrating(false);
      await adapter.reply(ctx, "Commands and events re-enabled.");
    }
  },
});
