import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { updateUserCoins } from "../../utils/database/updateUserCoins.js";
import { initializeUser } from "../../utils/database/initializeUser.js";

const round2 = (n: number) => Math.round(n * 100) / 100;

export default new TXCommand({
  name: "coin-toss",
  description: "Toss a coin and bet some of your coins on the outcome.",
  usage: "coin-toss <bet> <heads | tails>",
  minimumArguments: 2,
  aliases: ["ct", "coinflip", "cf"],
  cooldown: 10_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    let bet = parseFloat(args[0]);
    let side = args[1].toLowerCase();

    if (isNaN(bet) || bet <= 0) {
      await adapter.reply(ctx, `Invalid bet amount, enter a positive number`);
      return;
    }

    await initializeUser(ctx);
    let user = await Users.findOne(queryUser(ctx.platform, ctx.author.id));

    // unreachable
    if (!user || !user.economy) return;

    if (user.economy.coins < bet) {
      await adapter.reply(
        ctx,
        `Not enough coins. you have ${user.economy.coins} but tried to bet ${bet}.`,
      );
      return;
    }

    if (side !== "heads" && side !== "tails") {
      await adapter.reply(ctx, `Invalid side, choose either heads or tails`);
      return;
    }

    let computedSide = Math.random() < 0.5 ? "heads" : "tails";

    try {
      let oldBalance = user.economy.coins;
      let newBalance = await updateUserCoins(
        answerIsCorrect(side, computedSide) ? bet * 0.5 : -bet,
        ctx,
      );

      let message = answerIsCorrect(side, computedSide)
        ? winMessage(bet, computedSide, oldBalance, newBalance)
        : loseMessage(bet, computedSide, oldBalance, newBalance);

      await adapter.reply(ctx, message);
    } catch (e) {
      let err = e as Error;
      await adapter.reply(
        ctx,
        `Error while updating your balance: ${err.message}. Aborting coin toss.`,
      );
    }
  },
});

function answerIsCorrect(userSide: string, computedSide: string) {
  return userSide === computedSide;
}

function winMessage(
  bet: number,
  computedSide: string,
  oldBalance: number,
  newBalance: number,
) {
  return `  ↳ ❝ [ Coin Toss ] ¡! ❞
⁀➷ The coin has spoken... fortune favors you! 🪙
        ◇─◇───◇─◇

╭┈ Result : ̗̀➛
┊ 🎯 Side Won: ${computedSide.charAt(0).toUpperCase() + computedSide.slice(1)}
┊ 💰 Your Bet: ${bet} coins
┊ 🎉 Outcome:  You won!
╰─────────┈➤

╭┈ Balance : ̗̀➛
┊ 🪙 ${oldBalance} → ${newBalance} (+${bet})
╰────────────┈➤

𓆩⟡𓆪 +${bet} coins richer. keep it up! 🤑`;
}

function loseMessage(
  betAmount: number,
  computedSide: string,
  oldBalance: number,
  newBalance: number,
) {
  let bet = round2(betAmount);
  return `  ↳ ❝ [ Coin Toss ] ¡! ❞
⁀➷ The coin has spoken... luck wasn't on your side. 😔
        ◇─◇───◇─◇

╭┈ Result : ̗̀➛
┊ 🎯 Side Won: ${computedSide.charAt(0).toUpperCase() + computedSide.slice(1)}
┊ 💰 Your Bet: ${bet} coins
┊ 💸 Outcome:  You lost!
╰─────────┈➤

╭┈ Balance : ̗̀➛
┊ 🪙 ${oldBalance} → ${newBalance} (-${bet})
╰────────────┈➤

𓆩⟡𓆪 ${bet} coins. better luck next time! 😬`;
}
