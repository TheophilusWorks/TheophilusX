import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { updateUserCoins } from "../../utils/database/updateUserCoins.js";
import { randomRange } from "../../../utils/randomRange.js";
import { initializeUser } from "../../utils/database/initializeUser.js";

const round2 = (n: number) => Math.round(n * 100) / 100;
const SLOT_EMOJIS = ["🍒", "🍋", "⭐", "✨", "💎"];
const REEL_SLOTS = 3;

export default new TXCommand({
  name: "slot",
  description:
    "Spin the slot machine and gamble some of your coins on the outcome.",
  usage: "slot <bet>",
  minimumArguments: 1,
  aliases: ["spin"],
  shopInfo: {
    price: 20000,
  },
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    let bet = parseFloat(args[0]);

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

    try {
      let slotResult = slotSpin();
      let oldBalance = user.economy.coins;
      let matches = getMatches(slotResult);
      let multiplier = getMultiplier(matches);
      let coinDelta = round2(bet * multiplier);
      let newBalance = await updateUserCoins(coinDelta, ctx);
      let formatResult = formatSlotResult(
        slotResult,
        bet,
        multiplier,
        coinDelta,
        oldBalance,
        newBalance,
      );

      await adapter.reply(ctx, formatResult);
    } catch (e) {
      let err = e as Error;
      await adapter.reply(
        ctx,
        `An error occurred: ${err.message}... Aborting spin.`,
      );
    }
  },
});

function slotSpin(): string[] {
  let reel = [];

  for (let i = 0; i < REEL_SLOTS; i++) {
    let rng = Math.floor(randomRange(0, SLOT_EMOJIS.length));
    reel[i] = SLOT_EMOJIS[rng];
  }

  return reel;
}

function getMultiplier(matches: number): number {
  if (matches === 2) return 1;
  if (matches === 3) return 2;
  return -1;
}

function getMatches(reel: string[]): number {
  const freq: Record<string, number> = {};

  for (const symbol of reel) {
    freq[symbol] = (freq[symbol] || 0) + 1;
  }

  return Math.max(...Object.values(freq));
}

function getOutcomeLabel(matches: number): string {
  if (matches === 2) return "2 of a kind!";
  if (matches === 3) return "3 of a kind!";
  return "No match!";
}

function getHeader(matches: number): string {
  if (matches === 2) return "A glimmer of luck shines through! ✨";
  if (matches === 3) return "The stars are aligning...! ⭐";
  return "The reels are ruthless... 😔";
}

function getFooter(matches: number): string {
  if (matches === 2) return "a small spark! two matched! ✨";
  if (matches === 3) return "three of a kind! the machine smiles upon you! 🎉";
  return "the reels had no mercy... better luck next time! 😬";
}

function formatSlotResult(
  reel: string[],
  betAmount: number,
  multiplier: number,
  coinDelta: number,
  oldBalance: number,
  newBalance: number,
): string {
  let bet = round2(betAmount);
  let matches = getMatches(reel);
  let multiplierDisplay = multiplier > 0 ? ` ×${multiplier}` : "";
  let winAmount =
    coinDelta >= 0 ? `+${coinDelta * multiplier}` : `${coinDelta}`;

  return `  ↳ ❝ [ Slot Machine ] ¡! ❞
⁀➷ ${getHeader(matches)}
        ◇─◇───◇─◇

╭┈ Reels : ̗̀➛
┊ [ ${reel.join(" | ")} ]
╰─────────┈➤

╭┈ Result : ̗̀➛
┊ 🎯 Outcome:  ${getOutcomeLabel(matches)}
┊ 💰 Bet:      ${bet} coins
┊ 🪙 ${oldBalance} → ${newBalance} (${winAmount}${multiplierDisplay})
╰────────────┈➤

𓆩⟡𓆪 ${getFooter(matches)}`;
}
