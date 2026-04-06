import TXCommand from "../../../core/command/TXCommand";

export default new TXCommand({
  name: "ping",
  description: "Replies with Pong!",
  usage: "ping",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
    await adapter.reply(`Pong! Current platform: "${context.platform}"`);
  },
});
