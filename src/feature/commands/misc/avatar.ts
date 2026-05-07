import TXCommand from "../../../core/command/TXCommand.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";

export default new TXCommand({
  name: "avatar",
  description: "Replies your or someone's profile picture",
  usage: "avatar (user)",
  aliases: ["pfp", "profile"],
  minimumArguments: 0,
  cooldown: 15_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let targetUser = ctx.mentions[0] ?? ctx.author;
    await adapter.reply(ctx, {
      parts: [
        mention(targetUser.id, targetUser.displayName),
        text("'s Profile picture"),
      ],
      attachments: [targetUser.avatarURL],
    });
  },
});
