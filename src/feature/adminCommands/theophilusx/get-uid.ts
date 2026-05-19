import TXCommand from "../../../core/command/TXCommand.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import instance from "../../../instance.js";

export default new TXCommand({
  name: "get-uid",
  description: "Sends the target user's UID",
  usage: "get-uid (user) (--all)",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  aliases: ["uid"],
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async (ctx, { adapter, booleanFlags }) => {
    let isAll = booleanFlags?.["all"] ?? false;

    if (!isAll) {
      let target = ctx.mentions.length > 0 ? ctx.mentions[0] : ctx.author;

      if (ctx.author.isEveryone) {
        await adapter.reply(ctx, "@everyone don't any form of data.");
        return;
      }

      await adapter.reply(ctx, {
        parts: [
          mention(target.id, target.displayName),
          text("'s UID is: " + target.id),
        ],
      });
      return;
    }

    let oldCache = new Map(instance.userCache.getAll());
    let allUsers = await adapter.getAllUsers(ctx);

    let buffer = "";
    for (const user of allUsers) {
      buffer += `${user.displayName}: ${user.id}\n`;
    }
    instance.userCache.from(oldCache);

    await adapter.reply(ctx, buffer)
  },
});
