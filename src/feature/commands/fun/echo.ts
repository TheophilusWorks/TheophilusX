import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "echo",
  description: "Echoes your message.",
  usage: "echo (msg)",
  minimumArguments: 0,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    if (args.length > 0) {
      await adapter.reply(ctx, args.join(" "));
      return;
    }

    let msg = await adapter.reply(
      ctx,
      "Please reply to this message with the message you want to echo.",
    );
    let reply = await msg.waitReply({
      timeout: 30_000,
    });

    if (!reply) return;

    await reply.reply(reply.context.content);
  },
});
