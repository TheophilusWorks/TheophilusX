import TXCommand from "../../../core/command/TXCommand.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";

export default new TXCommand({
  name: "get-uid",
  description: "Sends the context of the message as a JSON string",
  usage: "reload",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  aliases: ["uid"],
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let target = ctx.mentions.length > 0 ? ctx.mentions[0] : ctx.author;

    await adapter.reply(ctx, {
      parts: [
        mention(target.id, target.displayName),
        text("'s UID is: " + target.id),
      ],
    });
  },
});
