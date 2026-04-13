import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { randomRange } from "../../../utils/randomRange.js";
import mongoose from "mongoose";

export default new TXCommand({
  name: "roulette",
  description: "Spin a roulette and gamble",
  usage: "roulette <bet> <red | black | green> (number)",
  minimumArguments: 2,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context, args }) => {
    let { platform, author } = context;
    const bet = parseFloat(args[0]);
    if (isNaN(bet) || bet <= 0) {
      await adapter.reply(
        context,
        `Invalid bet. Please enter a positive number.`,
      );
      return;
    }

    const color = args[1].toLowerCase() as TXRouletteColor;
    if (!["red", "black", "green"].includes(color)) {
      await adapter.reply(
        context,
        `Invalid color. Choose either red, black, or green.`,
      );
      return;
    }

    let guessNumber: number | null = null;
    if (args[2]) {
      const n = parseFloat(args[2]);
      if (isNaN(n) || n < 0 || n > 36) {
        await adapter.reply(
          context,
          `Invalid number. Must be between 0 and 36.`,
        );
        return;
      }
      guessNumber = n;
    }

    await Users.findOneAndUpdate(
      queryUser(platform, author.id),
      { $setOnInsert: { economy: initializeUserEconomy() } },
      { upsert: true },
    );

    const session = await mongoose.startSession();
    let resultData: TXRouletteResultData | null = null;

    try {
      await session.withTransaction(async () => {
        const user = await Users.findOne(queryUser(platform, author.id), null, {
          session,
        });

        if (!user || (user.economy?.coins ?? 0) < bet) {
          throw new Error("Insufficient balance");
        }

        const roll = rollRoulette();
        const payout = calcPayout(bet, color, guessNumber, roll);
        const won = payout > 0;
        const balanceChange = won ? payout - bet : -bet;
        const oldCoins = user.economy?.coins ?? 0;
        const newCoins = oldCoins + balanceChange;

        await Users.updateOne(
          queryUser(platform, author.id),
          { $inc: { "economy.coins": balanceChange } },
          { session },
        );

        resultData = { won, payout, oldCoins, newCoins, roll };
      });
    } catch (err) {
      const e = err as Error;
      if (e.message === "Insufficient balance") {
        await adapter.reply(
          context,
          `You don't have enough coins to bet ${bet}.`,
        );
      } else {
        await adapter.reply(context, `Something went wrong. Please try again.`);
      }
      return;
    } finally {
      await session.endSession();
    }

    if (!resultData) return;
    const { won, payout, oldCoins, newCoins, roll } =
      resultData as TXRouletteResultData;

    const colorEmoji: Record<TXRouletteColor, string> = {
      red: "🔴",
      black: "⚫",
      green: "🟢",
    };

    await adapter.reply(
      context,
      `
‗   ↳ ❝ [ Roulette ] ¡! ❞
ೃ⁀➷ The wheel has spoken...
         ◇─◇───◇─◇

╭┈ result : ̗̀➛
┊ ${colorEmoji[roll.color]} Landed: ${roll.color} (${roll.rouletteNumber})
┊ 🎯 Your guess: ${color}${guessNumber !== null ? ` (${guessNumber})` : ""}
┊ ${won ? "✅ You won!" : "❌ You lost."}
╰─────────┈➤

╭┈ balance : ̗̀➛
┊ 🪙 Coins: ${oldCoins} ➜ ${newCoins}${won ? ` (+${payout})` : ` (-${bet})`}
╰─────────┈➤

𓆩⟡𓆪 ${won ? `Payout: ${payout} coins!` : "Better luck next time!"}
`.trim(),
    );
  },
});

type TXRouletteColor = "black" | "red" | "green";

interface TXRouletteResult {
  color: TXRouletteColor;
  rouletteNumber: number;
}

interface TXRouletteResultData {
  won: boolean;
  payout: number;
  oldCoins: number;
  newCoins: number;
  roll: TXRouletteResult;
}

const REDS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function rollRoulette(): TXRouletteResult {
  const rouletteNumber = Math.floor(randomRange(0, 37, true));
  let color: TXRouletteColor;

  if (rouletteNumber === 0) color = "green";
  else if (REDS.has(rouletteNumber)) color = "red";
  else color = "black";

  return { color, rouletteNumber };
}

function calcPayout(
  bet: number,
  guessColor: TXRouletteColor,
  guessNumber: number | null,
  result: TXRouletteResult,
): number {
  if (guessNumber !== null && guessNumber === result.rouletteNumber)
    return bet * 35;
  if (guessColor === result.color) {
    if (guessColor === "green") return bet * 35;
    return bet * 2;
  }
  return 0;
}
