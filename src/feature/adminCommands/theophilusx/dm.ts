import TXCommand from "../../../core/command/TXCommand.js";
import { TXIAuthor, TXPlatform } from "../../../core/context/TXContext.js";

export default new TXCommand({
  name: "dm",
  description: "DM someone",
  usage: "dm <user | uid> <message>",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 10_000,
  minimumMentions: 0,
  exclusivePlatforms: [TXPlatform.FacebookMessenger],
  execute: async (ctx, { adapter, args }) => {
    let targetUser = args[0] ?? ctx.mentions[0];
    let msg = !isNaN(parseInt(args[0]))
      ? args.join(" ")
      : args.slice(1).join(" ");

    if (!targetUser) {
      await adapter.reply(ctx, "Specify a UID or mention/reply to someone");
      return;
    }

    let user: TXIAuthor | null = null;

    // UID
    if (typeof targetUser === "string") {
      user = await adapter.resolveUser(targetUser);
    } else {
      user = targetUser;
    }

    await adapter.sendMessage(user!.id, msg);
    await adapter.reply(ctx, `Successfullt sent a DM to ${user!.displayName}`);
  },
});
