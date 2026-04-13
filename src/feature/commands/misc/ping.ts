import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "ping",
  description: "Replies with Pong!",
  usage: "ping",
  minimumArguments: 0,
  cooldown: 3_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async ({ adapter, context }) => {
    await adapter.reply(
      context,
      `Pong! Current platform: "${context.platform}"`,
    );
  },
});
