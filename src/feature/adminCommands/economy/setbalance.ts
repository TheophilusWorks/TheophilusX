import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";

export default new TXCommand({
  name: "setbalance",
  description: "Shows your balance",
  usage: "setbalance (user) (coin | bank) (amount)",
  minimumArguments: 0,
  aliases: ["setbal", "sb"],
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
    let { platform, author } = context;

    let msg = await adapter.reply(
      context,
      `
User found. select what balance to edit

1: coins
2: bank balance

Reply to this message with your choice
`,
    );

    let res = await msg.waitReply({
      timeout: 120_000,
      filter: (msg) => msg.author.id == context.author.id,
    });

    if (!["1", "2"].includes(res?.context.content || "")) {
      await res?.reply("Invalid choice. Exiting...");
      return;
    }

    let msg2 = await adapter.reply(
      context,
      "Reply to this message with the amount you want to set",
    );

    let amount = await msg2.waitReply({
      timeout: 120_000,
      filter: (msg) => msg.author.id == context.author.id,
    });

    const parsed = parseFloat(amount?.context.content ?? "0");
    const field =
      res?.context.content === "1" ? "economy.coins" : "economy.bankBalance";

    await Users.findOneAndUpdate(
      queryUser(platform, author.id),
      { $set: { [field]: parsed } },
      { upsert: true },
    );

    await amount?.reply({
      parts: [
        text("Successfully changed "),
        mention(author.id, author.displayName),
        text("'s balance..."),
      ],
    });
  },
});
