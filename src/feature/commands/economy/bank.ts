import { join } from "node:path";
import TXCommand from "../../../core/command/TXCommand.js";
import { TXPlatform } from "../../../core/context/TXContext.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import { TXMessagePart } from "../../../core/message/TXMessagePart.js";
import mongoose from "mongoose";

type TXBankOperation = "withdraw" | "deposit";

export default new TXCommand({
  name: "bank",
  description: "Transfer money between your wallet and bank account.",
  usage: "bank <deposit | withdraw> <amount>",
  minimumArguments: 2,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    let bankOperation = args[0].toLowerCase();
    let amount = parseFloat(args[1]);

    if (bankOperation !== "withdraw" && bankOperation !== "deposit") {
      await adapter.reply(
        ctx,
        "Invalid bank operation. Please use 'deposit' or 'withdraw'.",
      );
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      await adapter.reply(
        ctx,
        "Invalid amount. Please enter a positive non-zero number",
      );
      return;
    }

    let session = await mongoose.startSession();

    try {
      session.withTransaction(async () => {
        // init user
        await Users.findOneAndUpdate(
          queryUser(ctx.platform, ctx.author.id),
          { $setOnInsert: { economy: initializeUserEconomy() } },
          { upsert: true, session },
        );

        let user = await Users.findOne(
          queryUser(ctx.platform, ctx.author.id),
        ).session(session);

        // unreachable
        if (!user || !user.economy) return;

        if ((bankOperation as TXBankOperation) == "deposit") {
          if (!hasEnoughBankBalance(user.economy?.bankBalance || 0, amount))
            throw new Error("Not enough bank balance");

          user.economy.coins -= amount;
          user.economy.bankBalance += amount;

          await user.save();
          await adapter.reply(ctx, "[ DEBUG ] DEPOSIT DONE");
        }
      });
    } catch {
    } finally {
      session.endSession();
    }
  },
});

function hasEnoughBankBalance(bankBalance: number, amount: number) {
  return amount <= bankBalance;
}
