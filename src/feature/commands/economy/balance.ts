import TXCommand from "../../../core/command/TXCommand.js";
import Users from "../../../core/database/model/Users.js";
import { queryUser } from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";

export default new TXCommand({
  name: "balance",
  description: "Check someone's balance",
  usage: "balance",
  minimumArguments: 0,
  aliases: ["bal"],
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
    let { platform } = context;
    let { id, displayName } =
      context.mentions.length != 0 ? context.mentions[0] : context.author;
    let query = queryUser(platform, id);
    let user = await Users.findOne(query);
    if (!user) user = new Users(query);

    adapter.reply(context, {
      parts: [
        text("⋆˚꩜｡ "),
        mention(id, displayName),
        text(`'s Balance`),
        text("\n﹌﹌﹌﹌﹌﹌﹌﹌﹌\n"),
        text(`⛃⛂ Coins: ${user.economy?.coins}\n`),
        text(`🏦💸 Bank balance: ${user.economy?.bankBalance}\n`),
      ],
    });
  },
});
