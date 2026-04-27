import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "get-sid",
  description: "Sends the server ID and the channel ID (when unique)",
  usage: "get-sid",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  aliases: ["sid"],
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let msg = "Server info:\n";
    msg += `SID: ${ctx.serverId}\n`;

    if (ctx.serverId !== ctx.channelId) {
      msg += `Channel ID: ${ctx.channelId}`;
    }

    await adapter.reply(ctx, msg);
  },
});
