import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { text, mention } from "../../../core/message/TXMessageBuilder.js";
import mongoose from "mongoose";

const TAX_RATE = 0.05;
const round2 = (n: number) => Math.round(n * 100) / 100;

export default new TXCommand({
  name: "bank",
  description: "Transfer money between your wallet and bank account.",
  usage: "bank <deposit | withdraw> <amount>",
  minimumArguments: 2,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    const bankOperation = args[0].toLowerCase();
    const amount = round2(parseFloat(args[1]));
    const author = ctx.author;

    if (bankOperation !== "withdraw" && bankOperation !== "deposit") {
      await adapter.reply(
        ctx,
        "Invalid bank bank operation. Use `deposit` or `withdraw`.",
      );
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      await adapter.reply(ctx, `Invalid amount, enter a positive number`);
      return;
    }

    const session = await mongoose.startSession();
    let replyParts: any[] = [];

    try {
      await session.withTransaction(async () => {
        await Users.findOneAndUpdate(
          queryUser(ctx.platform, ctx.author.id),
          { $setOnInsert: { economy: initializeUserEconomy() } },
          { upsert: true, session },
        );

        const user = await Users.findOne(
          queryUser(ctx.platform, ctx.author.id),
        ).session(session);

        if (!user || !user.economy) return;

        const { coins, bankBalance } = user.economy;

        if (bankOperation === "deposit") {
          if (coins < amount) {
            throw new Error(
              `Not enough coins — you have ${coins} but tried to deposit ${amount}.`,
            );
          }

          user.economy.coins = round2(coins - amount);
          user.economy.bankBalance = round2(bankBalance + amount);
          await user.save({ session });

          replyParts = [
            text(`‗   ↳ ❝ [ Bank ] ¡! ❞
⁀➷ Deposit successful, `),
            mention(author.id, author.displayName),
            text(
              `
◇─◇───◇─◇

╭┈  ̗̀➛
┊ 💰 Deposited  : ${amount}
┊ 🏦 Bank       : ${user.economy.bankBalance}
┊ 🪙 Coins      : ${user.economy.coins}
╰─────────┈➤`,
            ),
          ];
        } else {
          if (bankBalance < amount) {
            throw new Error(
              `Not enough bank balance — you have ${bankBalance} but tried to withdraw ${amount}.`,
            );
          }

          const tax = round2(amount * TAX_RATE);
          const received = round2(amount - tax);

          user.economy.coins = round2(coins + received);
          user.economy.bankBalance = round2(bankBalance - amount);
          await user.save({ session });

          replyParts = [
            text(`‗   ↳ ❝ [ Bank ] ¡! ❞\nೃ⁀➷ Withdrawal successful, `),
            mention(author.id, author.displayName),
            text(
              `
◇─◇───◇─◇

╭┈  ̗̀➛
┊ 💸 Withdrew   : ${amount}
┊ 🧾 Tax (5%)   : ${tax}\n┊ ✅ Received   : ${received}
┊ 🏦 Bank       : ${user.economy.bankBalance}\n┊ 🪙 Coins      : ${user.economy.coins}
╰─────────┈➤`,
            ),
          ];
        }
      });
    } catch (err) {
      console.error("Bank transaction error:", err);
      replyParts = [
        text(`‗   ↳ ❝ [ Bank ] ¡! ❞
⁀➷ Transaction failed, `),
        mention(author.id, author.displayName),
        text(
          `
◇─◇───◇─◇

╭┈  ̗̀➛
┊ ⚠️ ${(err as Error).message}
╰─────────┈➤`,
        ),
      ];
    } finally {
      session.endSession();
    }

    await adapter.reply(ctx, { parts: replyParts });
  },
});
