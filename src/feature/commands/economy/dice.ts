import TXCommand from "../../../core/command/TXCommand.js";
import { randomRange } from "../../../utils/randomRange.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { initializeUser } from "../../utils/database/initializeUser.js";
import mongoose from "mongoose";

const PAYOUT_MULTIPLIER = 2;

export default new TXCommand({
  name: "dice",
  description: "Rattle the dice and gamble your bet",
  usage: "dice <bet> <side>",
  minimumArguments: 2,
  cooldown: 10_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    let bet = parseFloat(args[0]);
    let side = parseInt(args[1]);

    if (isNaN(bet) || bet <= 0) {
      await adapter.reply(ctx, `Invalid bet. Please enter a positive number.`);
      return;
    }

    if (isNaN(side) || side < 1 || side > 6) {
      await adapter.reply(
        ctx,
        "Invalid side. Please choose a number between 1–6 (inclusive)",
      );
      return;
    }

    await initializeUser(ctx);
    let userData = await Users.findOne(queryUser(ctx.platform, ctx.author.id));

    // unreachable
    if (!userData || !userData.economy) return;
    if (userData.economy.coins < bet) {
      await adapter.reply(
        ctx,
        `Not enough balance. You tried to bet ${bet} coins but you only have ${userData.economy.coins}`,
      );
      return;
    }

    let randomSide = Math.floor(randomRange(1, 6, true));
    let session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const didWin = randomSide === side;
        const netDelta = didWin ? bet * PAYOUT_MULTIPLIER - bet : -bet;

        let userOld = await Users.findOneAndUpdate(
          queryUser(ctx.platform, ctx.author.id),
          { $inc: { "economy.coins": netDelta } },
          { session, returnDocument: "before" },
        );

        const balanceBefore = userOld!.economy!.coins;

        await adapter.reply(
          ctx,
          formatDiceGameMessage({
            chosenNumber: side,
            rolledNumber: randomSide,
            betAmount: bet,
            balanceBefore,
            multiplier: PAYOUT_MULTIPLIER,
          }),
        );
      });
    } finally {
      session.endSession();
    }
  },
});

type DiceResultParams = {
  chosenNumber: number;
  rolledNumber: number;
  betAmount: number;
  balanceBefore: number;
  multiplier: number;
};

export function formatDiceGameMessage({
  chosenNumber,
  rolledNumber,
  betAmount,
  balanceBefore,
  multiplier,
}: DiceResultParams): string {
  const isWin = chosenNumber === rolledNumber;

  const outcomeText = isWin
    ? multiplier > 1
      ? "Perfect hit!"
      : "You won!"
    : "You lost...";

  const hitMark = isWin ? "✅" : "❌";

  const payout = isWin ? betAmount * multiplier : 0;
  const balanceAfter = balanceBefore + payout - (isWin ? 0 : betAmount);
  const profit = isWin ? `+${payout}` : `-${betAmount}`;

  const flavorPoolWin = [
    "the dice didn’t just roll… they listened 🎲✨",
    "luck leaned your way this time 🍀",
    "clean hit. no hesitation. 🎯",
  ];

  const flavorPoolLose = [
    "the dice had other plans… 🎲",
    "fortune blinked—and missed 😵",
    "that roll felt personal…",
  ];

  const flavorText = isWin
    ? flavorPoolWin[Math.floor(Math.random() * flavorPoolWin.length)]
    : flavorPoolLose[Math.floor(Math.random() * flavorPoolLose.length)];

  return `
↳ ❝ [ Dice Game ] ¡! ❞
⁀➷ The dice have been cast... fate reveals your number. 🎲
  ◇─◇───◇─◇

╭┈ Result : ̗̀➛
┊ 🎯 Your Number: ${chosenNumber}
┊ 🎲 Rolled Number: ${rolledNumber}
┊ 💰 Your Bet: ${betAmount} coins
┊ 🧾 Outcome: ${outcomeText}
╰─────────┈➤

╭┈ Roll Details : ̗̀➛
┊ 🎲 Dice Roll ➜ ${rolledNumber}
┊ 🎯 Target    ➜ ${chosenNumber} ${hitMark}
┊ ⚖️ Multiplier ➜  ${multiplier}
╰────────────┈➤

╭┈ Balance : ̗̀➛
┊ 🪙 ${balanceBefore} ➜ ${balanceAfter} (${profit})
╰────────────┈➤

𓆩⟡𓆪 ${flavorText}
`.trim();
}
