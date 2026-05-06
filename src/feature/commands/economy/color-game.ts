import TXCommand from "../../../core/command/TXCommand.js";
import TXICommandArgument from "../../../types/TXICommandArgument.js";
import { randomRange } from "../../../utils/randomRange.js";
import { initializeUser } from "../../utils/database/initializeUser.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import mongoose from "mongoose";

const PAYOUT_RATES = {
  red: 1.95,
  blue: 1.95,
  green: 1.95,
  yellow: 1.95,
  orange: 1.95,
  violet: 4.5,
};

type Color = keyof typeof PAYOUT_RATES;

const COLOR_EMOJIS: Record<Color, string> = {
  red: "🔴",
  green: "🟢",
  blue: "🔵",
  yellow: "🟡",
  orange: "🟠",
  violet: "🟣",
};

export default new TXCommand({
  name: "color-game",
  description: "Bet on a color and double your bet!",
  usage: "color-game [<bet> <color>, ...] {--list-colors}",
  aliases: ["cg"],
  minimumArguments: 0,
  cooldown: 10_000,
  minimumGroupedArguments: 0,
  shopInfo: {
    price: 25000,
  },
  minimumMentions: 0,
  execute: async (ctx, { adapter, groupedArgs, booleanFlags }) => {
    let inspectColors = booleanFlags?.["list-colors"] ?? false;

    if (inspectColors) {
      await adapter.reply(ctx, getColorListMessage());
      return;
    }

    if (groupedArgs.length == 0) {
      await adapter.reply(ctx, incorrectSyntax());
      return;
    }

    if (!validSyntax(groupedArgs)) {
      await adapter.reply(ctx, incorrectSyntax());
      return;
    }

    // parse bets: { color -> bet amount }
    const bets: Record<string, number> = {};
    for (const field of groupedArgs) {
      const color = field.args[0] as Color;
      const bet = parseFloat(field.command);
      // accumulate if same color bet twice
      bets[color] = (bets[color] ?? 0) + bet;
    }

    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

    await initializeUser(ctx);
    let userData = await Users.findOne(queryUser(ctx.platform, ctx.author.id));

    // unreachable
    if (!userData || !userData.economy) return;

    if (userData.economy.coins < totalBet) {
      await adapter.reply(
        ctx,
        insufficientBalance(totalBet, userData.economy.coins),
      );
      return;
    }

    const wonColor = getRandomColor() as Color;
    let netDelta = -totalBet;
    if (bets[wonColor] !== undefined) {
      const payout = bets[wonColor] * PAYOUT_RATES[wonColor];
      netDelta += payout; // add back what was won
    }

    const didWin = netDelta > 0;
    let session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        let userOld = await Users.findOneAndUpdate(
          queryUser(ctx.platform, ctx.author.id),
          {
            $inc: {
              "economy.coins": netDelta,
            },
          },
          { session, returnDocument: "before" },
        );

        let balanceBefore = userOld!.economy!.coins;
        let balanceAfter = balanceBefore + netDelta;

        await adapter.reply(
          ctx,
          getEndMessage({
            wonColor,
            bets,
            totalBet,
            netDelta,
            didWin,
            balanceBefore,
            balanceAfter,
          }),
        );
      });
    } finally {
      session.endSession();
    }
  },
});

function validSyntax(groupedArgs: TXICommandArgument[]) {
  let colors = Object.keys(COLOR_EMOJIS);
  for (const field of groupedArgs) {
    let { command: betRaw, args } = field;
    let color = args[0];
    let bet = parseFloat(betRaw);

    if (isNaN(bet) || bet <= 0) return false;
    if (!colors.includes(color)) return false;
  }

  return true;
}

function getRandomColor(): string {
  let colors = Object.keys(COLOR_EMOJIS);
  let rng = Math.floor(randomRange(0, colors.length));
  return colors[rng];
}

interface EndMessageOptions {
  wonColor: Color;
  bets: Record<string, number>;
  totalBet: number;
  netDelta: number;
  didWin: boolean;
  balanceBefore: number;
  balanceAfter: number;
}

function getEndMessage({
  wonColor,
  bets,
  totalBet,
  netDelta,
  didWin,
  balanceBefore,
  balanceAfter,
}: EndMessageOptions): string {
  const wonEmoji = COLOR_EMOJIS[wonColor];
  const outcomeLabel = didWin ? "You won!" : "You lost!";
  const headerFlair = didWin
    ? "⁀➷ The colors have settled... fortune smiles upon you. ✨"
    : "⁀➷ The colors have settled... fate has chosen. 🎡";

  const deltaSign = netDelta >= 0 ? "+" : "";
  const deltaStr = `${deltaSign}${Math.round(netDelta)}`;

  const breakdownLines = Object.entries(bets)
    .map(([color, bet]) => {
      const emoji = COLOR_EMOJIS[color as Color];
      const padded = capitalize(color).padEnd(7);
      if (color === wonColor) {
        const payout = Math.round(bet * PAYOUT_RATES[wonColor]);
        const multiplier = PAYOUT_RATES[wonColor];
        return `┊ ${emoji} ${padded} → ${bet} ✅ (x${multiplier} = ${payout})`;
      }
      return `┊ ${emoji} ${padded} → ${bet} ❌`;
    })
    .join("\n");

  const closingLine = didWin
    ? `𓆩⟡𓆪 ${wonColor} hit… luck actually showed up this time 🎡✨`
    : `𓆩⟡𓆪 ${totalBet} coins gone in a blink... the wheel showed no mercy 😬`;

  return `↳ ❝ [ Color Game ] ¡! ❞
${headerFlair}
\t◇─◇───◇─◇

╭┈ Result : ̗̀➛
┊ 🎯 Winning Color: ${wonEmoji} ${capitalize(wonColor)}
┊ 💰 Your Bets: ${totalBet} coins
┊ 🧾 Outcome: ${outcomeLabel}
╰─────────┈➤

╭┈ Bets Breakdown : ̗̀➛
${breakdownLines}
╰────────────┈➤

╭┈ Balance : ̗̀➛
┊ 🪙 ${Math.round(balanceBefore)} → ${Math.round(balanceAfter)} (${deltaStr})
╰────────────┈➤

${closingLine}`;
}

function incorrectSyntax() {
  return `↳ ❝ [ Color Game ] ¡! ❞
⁀➷ That command didn't quite land right… check the format and try again. 😬
  ◇─◇───◇─◇

╭┈ Error : ̗̀➛
┊ ⚠️ Invalid bet syntax detected
┊ 📌 Correct Format:
┊ [<bet> <color>, <bet> <color>, ...]
╰─────────┈➤

╭┈ Help : ̗̀➛
┊ 🎨 To view all available colors:
┊ %color-game --list-colors
╰────────────┈➤

𓆩⟡𓆪 fix the format and try again… make sure your bet is a non-negative number... the wheel is waiting 🎡`;
}

function getColorListMessage(): string {
  const header = `↳ ❝ [ Color Game ] ¡! ❞
⁀➷ The wheel speaks in six colors… choose your fate wisely. 🎡
  ◇─◇───◇─◇

╭┈ Available Colors : ̗̀➛`;

  const body = (Object.keys(PAYOUT_RATES) as Color[])
    .map((color) => {
      const emoji = COLOR_EMOJIS[color];
      const rate = PAYOUT_RATES[color];
      return `┊ ${emoji} ${capitalize(color)} ➜ ${color} (x${rate})`;
    })
    .join("\n");

  const footer = `\n╰────────────┈➤

𓆩⟡𓆪 place your bets before the round begins… luck doesn't wait 🎲`;

  return `${header}\n${body}\n${footer}`;
}

function insufficientBalance(totalBet: number, balance: number): string {
  return `↳ ❝ [ Color Game ] ¡! ❞
⁀➷ Your pockets aren't deep enough for this bet… 😬
  ◇─◇───◇─◇

╭┈ Error : ̗̀➛
┊ ⚠️ Insufficient balance
┊ 💸 Total Bet : ${totalBet} coins
┊ 🪙 Your Balance : ${balance} coins
╰─────────┈➤

𓆩⟡𓆪 top up and try again… the wheel waits for no one 🎡`;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
