import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "leave",
  description: "Leaves the current server",
  usage: "leave",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    await adapter.reply(ctx, "👋 See y'all next time 🥲");
    let botUid = await adapter.resolveSelfUID();
    await adapter.kickUser(botUid, ctx.serverId);
  },
});
