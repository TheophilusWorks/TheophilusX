import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "ping",
  description: "Replies with Pong!",
  usage: "ping",
  minimumArguments: 0,
  cooldown: 2_000, // 2s
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
    await adapter.reply(
      context,
      `Pong! Current platform: "${context.platform}"`,
    );
  },
});
