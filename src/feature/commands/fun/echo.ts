import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "echo",
  description: "Echoes your message.",
  usage: "echo (msg)",
  minimumArguments: 0,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context, args }) => {
    if (args.length > 0) {
      await adapter.reply(context, args.join(" "));
      return
    }

    let msg = await adapter.reply(context, "Please reply to this message with the message you want to echo.");
    let reply = await msg?.waitReply({
      timeout: 30_000,
    })

    adapter.reply(context, reply?.content || "")
  },
});
