import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";

export default new TXCommand({
  name: "delete",
  description: "Deletes the data of the given user",
  usage: "delete <uid, uid, uid, ..>",
  aliases: ["wipe"],
  minimumArguments: 1,
  minimumMentions: 0,
  cooldown: 0,
  minimumGroupedArguments: 0,
  execute: async (ctx, { adapter, args }) => {
    await adapter.reply(ctx, `Starting data deletion`);

    for (const userId of args) {
      await Users.deleteOne(queryUser(ctx.platform, userId));
      let user = await adapter.resolveUser(userId);
      await adapter.reply(ctx, `Deleted ${user?.displayName || "user"}'s data`);
    }

    await adapter.reply(ctx, `Deleted ${args.length} user data(s)`);
  },
});
