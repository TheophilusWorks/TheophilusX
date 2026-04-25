import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { randomRange } from "../../../utils/randomRange.js";
import mongoose from "mongoose";
import wordleWords from "../../../../assets/wordleWords.json" with { type: "json" };
import nonWordleWords from "../../../../assets/nonWordleWords.json" with { type: "json" };
import { initializeUser } from "../../utils/database/initializeUser.js";

enum TXWordleColor {
  Green = "🟩",
  Yellow = "🟨",
  Black = "⬛",
}

interface TXWordleResult {
  result: TXWordleColor[];
  correct: boolean;
}

const NOTIFIED_USERS = new Set<string>();
const WORDLE_NOTIFY = new Set<string>();
const WORDLE_ROWS = 6;
const WIN_MULTIPLIER = 2.5;
const MAX_DAILY_BET_GAMES = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export default new TXCommand({
  name: "wordle",
  description: "Play wordle",
  usage: "wordle [bet]",
  minimumArguments: 0,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    const hasBet = args.length > 0 && args[0] !== undefined;
    let bet = hasBet ? parseFloat(args[0]) : 0;

    if (hasBet && (isNaN(bet) || bet <= 0)) {
      await adapter.reply(ctx, formatError("Invalid bet amount."));
      return;
    }

    await initializeUser(ctx);
    const user = await Users.findOne(queryUser(ctx.platform, ctx.author.id));
    if (!user) return;

    const now = Date.now();

    if (hasBet) {
      const coins = user.economy!.coins;

      if (bet > coins) {
        await adapter.reply(
          ctx,
          formatError(
            `Insufficient balance.\nYou have 🪙 ${coins} coins but bet 🪙 ${bet}.`,
          ),
        );
        return;
      }

      const nextWordleBet = user.economy!.nextWordleBet ?? 0;
      const wordleBetCount = user.economy!.wordleBetCount ?? 0;

      // Active cooldown — already stamped
      if (nextWordleBet > now) {
        const remaining = nextWordleBet - now;
        const hours = Math.floor(remaining / 3_600_000);
        const minutes = Math.floor((remaining % 3_600_000) / 60_000);
        await adapter.reply(
          ctx,
          formatError(
            `You've used all ${MAX_DAILY_BET_GAMES} betted games for today.\n⏳ Resets in ${hours}h ${minutes}m.\n\nYou can still play without a bet!`,
          ),
        );
        return;
      }

      // Hit the limit — stamp the cooldown now
      if (wordleBetCount >= MAX_DAILY_BET_GAMES) {
        await Users.updateOne(queryUser(ctx.platform, ctx.author.id), {
          $set: {
            "economy.nextWordleBet": now + DAY_MS,
            "economy.wordleBetCount": 0,
          },
        });
        await adapter.reply(
          ctx,
          formatError(
            `You've used all ${MAX_DAILY_BET_GAMES} betted games for today.\n⏳ Come back in 24h.\n\nYou can still play without a bet!`,
          ),
        );
        return;
      }
    }

    const wordle = getRandomWordle();
    const answers: Map<string, string> = new Map();
    let won = false;
    let timedOut = false;

    await adapter.reply(ctx, formatGameStart(bet, hasBet));

    while (answers.size < WORDLE_ROWS) {
      const prompt = await adapter.reply(
        ctx,
        formatBoard(answers, answers.size + 1),
      );

      const guess = await prompt.waitReply({
        timeout: 120_000,
        filter: (msg) => msg.author.id === ctx.author.id,
      });

      if (!guess) {
        timedOut = true;
        break;
      }

      const content = guess.context.content.trim().toLowerCase();

      if (content.length !== 5) {
        const key = `len-${ctx.platform}-${ctx.author.id}`;
        if (!NOTIFIED_USERS.has(key)) {
          await guess.reply(formatError("Guess must be exactly 5 letters."));
          NOTIFIED_USERS.add(key);
          setTimeout(() => NOTIFIED_USERS.delete(key), 15_000);
        }
        continue;
      }

      if (![...wordleWords, ...nonWordleWords].includes(content)) {
        const key = `word-${content}-${ctx.platform}-${ctx.author.id}`;
        if (!WORDLE_NOTIFY.has(key)) {
          await guess.reply(
            formatError(`"${content.toUpperCase()}" is not a valid word.`),
          );
          WORDLE_NOTIFY.add(key);
          setTimeout(() => WORDLE_NOTIFY.delete(key), 15_000);
        }
        continue;
      }

      const res = validateWordle(content, wordle);
      answers.set(content, res.result.join(""));

      if (res.correct) {
        won = true;
        break;
      }
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        if (timedOut) {
          await adapter.reply(ctx, formatTimeout(wordle, hasBet));
          return;
        }

        if (hasBet) {
          const freshUser = await Users.findOne(
            queryUser(ctx.platform, ctx.author.id),
            null,
            { session },
          );
          if (!freshUser) throw new Error("Could not load user data.");

          const coins = freshUser.economy!.coins;
          if (bet > coins) {
            await adapter.reply(
              ctx,
              formatError(
                `Insufficient balance.\nYou have 🪙 ${coins} coins but bet 🪙 ${bet}.`,
              ),
            );
            return;
          }

          // Deduct bet + increment count
          await Users.updateOne(
            queryUser(ctx.platform, ctx.author.id),
            {
              $inc: {
                "economy.coins": -bet,
                "economy.wordleBetCount": 1,
              },
            },
            { session },
          );

          if (won) {
            const winnings = Math.floor(bet * WIN_MULTIPLIER);
            const updated = await Users.findOneAndUpdate(
              queryUser(ctx.platform, ctx.author.id),
              { $inc: { "economy.coins": winnings } },
              { session, returnDocument: "before" },
            );
            const oldCoins = (updated?.economy?.coins ?? 0) + bet;
            const newCoins = oldCoins - bet + winnings;
            await adapter.reply(
              ctx,
              formatWin(answers, oldCoins, newCoins, winnings, bet),
            );
          } else {
            const updated = await Users.findOne(
              queryUser(ctx.platform, ctx.author.id),
              null,
              { session },
            );
            const currentCoins = updated?.economy?.coins ?? 0;
            const oldCoins = currentCoins + bet;
            await adapter.reply(
              ctx,
              formatLose(answers, wordle, oldCoins, currentCoins, bet),
            );
          }
        } else {
          if (won) {
            await adapter.reply(ctx, formatWinNoBet(answers));
          } else {
            await adapter.reply(ctx, formatLoseNoBet(answers, wordle));
          }
        }
      });
    } catch (err) {
      const e = err as Error;
      await adapter.reply(
        ctx,
        formatError(`Something went wrong settling your bet.\n${e.message}`),
      );
    } finally {
      session.endSession();
    }
  },
});

function formatError(msg: string): string {
  return [`‗   ↳ ❝ [ Wordle ] ¡! ❞`, `ೃ⁀➷ ${msg}`].join("\n");
}

function formatGameStart(bet: number, hasBet: boolean): string {
  return [
    `‗   ↳ ❝ [ Wordle ] ¡! ❞`,
    `ೃ⁀➷ Game started!${hasBet ? ` Bet: 🪙 ${bet}` : " (No bet)"}`,
    `         ◇─◇───◇─◇`,
    ``,
    `╭┈ rules ̗̀➛`,
    `┊ 🟩 right letter, right spot`,
    `┊ 🟨 right letter, wrong spot`,
    `┊ ⬛ not in word`,
    `┊`,
    `┊ 🎯 ${WORDLE_ROWS} attempts${hasBet ? ` · 💰 ×${WIN_MULTIPLIER} on win` : ""}`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Reply with your first guess!`,
  ].join("\n");
}

function formatBoard(answers: Map<string, string>, currentRow: number): string {
  const rows: string[] = [];
  let i = 1;
  for (const [word, result] of answers) {
    rows.push(`┊ ${i}  ${word.toUpperCase().split("").join(" · ")}`);
    rows.push(`┊    ${result}`);
    i++;
  }
  for (let r = answers.size + 1; r <= WORDLE_ROWS; r++) {
    rows.push(`┊ ${r}  · · · · ·`);
    rows.push(`┊    ⬜⬜⬜⬜⬜`);
  }
  return [
    `‗   ↳ ❝ [ Wordle — ${currentRow}/${WORDLE_ROWS} ] ❞`,
    `╭─────────────────`,
    ...rows,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Reply with guess #${currentRow}`,
  ].join("\n");
}

function formatWin(
  answers: Map<string, string>,
  oldCoins: number,
  newCoins: number,
  winnings: number,
  bet: number,
): string {
  const attempts = answers.size;
  const board = buildFinalBoard(answers);
  const flavor =
    attempts <= 2
      ? "Unreal. 🔥"
      : attempts <= 4
        ? "Nice solve! ✨"
        : "Cutting it close! 😅";
  return [
    `‗   ↳ ❝ [ Wordle — Victory! ] ¡! ❞`,
    `ೃ⁀➷ Solved in ${attempts}/${WORDLE_ROWS}! ${flavor}`,
    `         ◇─◇───◇─◇`,
    ``,
    `╭─────────────────`,
    ...board,
    `╰─────────┈➤`,
    ``,
    `╭┈ rewards ̗̀➛`,
    `┊ 🪙 Bet: ${bet}`,
    `┊ 💰 Won: +${winnings}`,
    `┊`,
    `┊ 🪙 ${oldCoins} ➜ ${newCoins}`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Wordsmith energy.`,
  ].join("\n");
}

function formatLose(
  answers: Map<string, string>,
  wordle: string,
  oldCoins: number,
  newCoins: number,
  bet: number,
): string {
  const board = buildFinalBoard(answers);
  return [
    `‗   ↳ ❝ [ Wordle — Game Over ] ¡! ❞`,
    `ೃ⁀➷ Out of attempts...`,
    `         ◇─◇───◇─◇`,
    ``,
    `╭─────────────────`,
    ...board,
    `╰─────────┈➤`,
    ``,
    `╭┈ result ̗̀➛`,
    `┊ 🔤 Word: ${wordle.toUpperCase()}`,
    `┊ 🪙 Lost: -${bet}`,
    `┊`,
    `┊ 🏦 ${oldCoins} ➜ ${newCoins}`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 The word was right there...`,
  ].join("\n");
}

function formatWinNoBet(answers: Map<string, string>): string {
  const attempts = answers.size;
  const board = buildFinalBoard(answers);
  const flavor =
    attempts <= 2
      ? "Unreal. 🔥"
      : attempts <= 4
        ? "Nice solve! ✨"
        : "Cutting it close! 😅";
  return [
    `‗   ↳ ❝ [ Wordle — Victory! ] ¡! ❞`,
    `ೃ⁀➷ Solved in ${attempts}/${WORDLE_ROWS}! ${flavor}`,
    `         ◇─◇───◇─◇`,
    ``,
    `╭─────────────────`,
    ...board,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Wordsmith energy. Try betting next time!`,
  ].join("\n");
}

function formatLoseNoBet(answers: Map<string, string>, wordle: string): string {
  const board = buildFinalBoard(answers);
  return [
    `‗   ↳ ❝ [ Wordle — Game Over ] ¡! ❞`,
    `ೃ⁀➷ Out of attempts...`,
    `         ◇─◇───◇─◇`,
    ``,
    `╭─────────────────`,
    ...board,
    `╰─────────┈➤`,
    ``,
    `╭┈ result ̗̀➛`,
    `┊ 🔤 Word: ${wordle.toUpperCase()}`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 The word was right there...`,
  ].join("\n");
}

function formatTimeout(wordle: string, hasBet: boolean): string {
  return [
    `‗   ↳ ❝ [ Wordle — Timed Out ] ¡! ❞`,
    `ೃ⁀➷ 2 minutes up.${hasBet ? " Bet is forfeit." : ""}`,
    ``,
    `╭┈ reveal ̗̀➛`,
    `┊ 🔤 Word: ${wordle.toUpperCase()}`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Come back and try again!`,
  ].join("\n");
}

function buildFinalBoard(answers: Map<string, string>): string[] {
  const rows: string[] = [];
  let i = 1;
  for (const [word, result] of answers) {
    rows.push(`┊ ${i}  ${word.toUpperCase().split("").join(" · ")}`);
    rows.push(`┊    ${result}`);
    i++;
  }
  for (let r = answers.size + 1; r <= WORDLE_ROWS; r++) {
    rows.push(`┊ ${r}  · · · · ·`);
    rows.push(`┊    ⬜⬜⬜⬜⬜`);
  }
  return rows;
}

function getRandomWordle(): string {
  const words = wordleWords as string[];
  return words[Math.floor(randomRange(0, words.length))];
}

function validateWordle(guess: string, answer: string): TXWordleResult {
  const result: TXWordleColor[] = new Array(5);
  const used: boolean[] = [false, false, false, false, false];
  const letterCount: Record<string, number> = {};
  let correct = true;

  for (const letter of answer) {
    letterCount[letter] = (letterCount[letter] || 0) + 1;
  }

  for (let i = 0; i < 5; i++) {
    if (answer[i] === guess[i]) {
      result[i] = TXWordleColor.Green;
      letterCount[guess[i]]--;
      used[i] = true;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (used[i]) continue;
    if (letterCount[guess[i]] > 0) {
      result[i] = TXWordleColor.Yellow;
      letterCount[guess[i]]--;
    } else {
      result[i] = TXWordleColor.Black;
    }
  }

  for (const value of result) {
    if (value !== TXWordleColor.Green) {
      correct = false;
      break;
    }
  }

  return { result, correct };
}
