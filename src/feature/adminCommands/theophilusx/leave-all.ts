import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "leave-all",
  description: "Leaves all the server the bot is in",
  usage: "leave-all",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let serverUIDs = await adapter.getAllServersUID();
    let botUid = await adapter.resolveSelfUID();

    for (const serverId of serverUIDs) {
      if (serverId == ctx.serverId) continue;
      await adapter.kickUser(botUid, serverId);
    }

    await adapter.reply(
      ctx,
      `Successfully left all ${serverUIDs.length - 1} servers. Leaving here too, 👋 Goodbye 🥲`,
    );
    await adapter.kickUser(botUid, ctx.serverId);
  },
});
