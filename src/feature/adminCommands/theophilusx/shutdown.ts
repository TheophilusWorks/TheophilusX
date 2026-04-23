import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "shutdown",
  description: "Shuts down TheophilusX",
  usage: "shutdown",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    await adapter.reply(ctx, "Shutting down...");
    process.exit(0);
  },
});
