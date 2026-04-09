import TXCommand from "../../../core/command/TXCommand.js";
import Users from "../../../core/database/model/Users.js";
import { queryUser } from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";

export default new TXCommand({
  name: "balance",
  description: "Shows your balance",
  usage: "balance",
  minimumArguments: 0,
  aliases: ["bal"],
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
    let { platform, author, serverId } = context;
    let query = queryUser(platform, serverId, author.id);
    let user = await Users.findOne(query);
    if (!user) user = new Users(query);

    adapter.reply(context, {
      parts: [
        text("⋆˚꩜｡ "),
        mention(context.author.id, context.author.displayName),
        text(`'s Balance`),
        text("\n﹌﹌﹌﹌﹌﹌﹌﹌﹌\n"),
        text(`⛃⛂ Coins: ${user.economy?.coins}\n`),
        text(`🏦💸 Bank balance: ${user.economy?.bankBalance}\n`),
      ],
    });
  },
});
