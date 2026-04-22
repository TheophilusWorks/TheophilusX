import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  initializeUserEconomy,
  queryUser,
} from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import { TXIAuthor, TXPlatform } from "../../../core/context/TXContext.js";
import { TXMessagePart } from "../../../core/message/TXMessagePart.js";

export default new TXCommand({
  name: "setbalance",
  description: "Shows your balance",
  usage: "setbalance (user1, user2, ...) <coins | bank> <amount>",
  minimumArguments: 2,
  minimumMentions: 0,
  aliases: ["setbal", "sb"],
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async (ctx, { adapter, args }) => {
    let targets = ctx.mentions[0] ? ctx.mentions : [ctx.author];
    let targetStorage = args[0].toLowerCase();
    let amount = parseFloat(args[1]);

    if (ctx.author.isEveryone) {
      await adapter.reply(ctx, "@everyone don't any form of data.");
      return
    }

    if (!["coins", "bank"].includes(targetStorage)) {
      await adapter.reply(
        ctx,
        `Invalid storage "${targetStorage}". Please pick either 'coins' or 'bank'`,
      );
      return;
    }

    console.log(targetStorage);

    if (isNaN(amount) || amount < 0) {
      await adapter.reply(
        ctx,
        "Invalid amount. Please enter a non-negative number",
      );
      return;
    }

    let parts: TXMessagePart[] = [];
    for (const user of targets) {
      if (user.isSelf) {
        await adapter.reply(ctx, "I don't any form of data.");
        continue;
      }

      await setUserStorageTo(user, ctx.platform, targetStorage, amount);
      parts.push(mention(user.id, user.displayName));
      parts.push(text(", ")); // seperator
    }

    // pop out the last guaranteed comma
    parts.pop();

    await adapter.reply(ctx, {
      parts: [
        text("Successfully set "),
        ...parts,
        text(`'s ${targetStorage} to ${amount}`),
      ],
    });
  },
});

async function setUserStorageTo(
  user: TXIAuthor,
  platform: TXPlatform,
  storage: string,
  amount: number,
) {
  storage = storage == "bank" ? "bankBalance" : storage;

  await Users.findOneAndUpdate(
    queryUser(platform, user.id),
    {
      $setOnInsert: { economy: initializeUserEconomy() },
    },
    { upsert: true },
  );
  await Users.findOneAndUpdate(queryUser(platform, user.id), {
    $set: { [`economy.${storage}`]: amount },
  });
}
