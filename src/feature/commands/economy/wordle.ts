import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { randomRange } from "../../../utils/randomRange.js";
import mongoose from "mongoose";
import wordleWords from "../../../../assets/wordleWords.json" with { type: "json" };
import nonWordleWords from "../../../../assets/nonWordleWords.json" with { type: "json" };

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

export default new TXCommand({
  name: "wordle",
  description: "Play wordle",
  usage: "wordle <bet>",
  minimumArguments: 1,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context, args }) => {
    let wordle = getRandomWordle();
    let answers: Map<string, string> = new Map();
    let session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        let bet = parseFloat(args[0]);

        if (isNaN(bet) || bet <= 0) {
          await adapter.reply(context, formatError("Invalid bet amount."));
          return;
        }

        await Users.findOneAndUpdate(
          queryUser(context.platform, context.author.id),
          { $setOnInsert: { economy: initializeUserEconomy() } },
          { upsert: true, session },
        );

        let user = await Users.findOne(
          queryUser(context.platform, context.author.id),
          null,
          { session },
        );

        if (!user) return;

        let coins = user.economy!.coins;

        if (bet > coins) {
          await adapter.reply(
            context,
            formatError(
              `Insufficient balance.\nYou have 🪙 ${coins} coins but bet 🪙 ${bet}.`,
            ),
          );
          return;
        }

        // deduct bet immediately.. prevents any dupe exploit
        await Users.updateOne(
          queryUser(context.platform, context.author.id),
          { $inc: { "economy.coins": -bet } },
          { session },
        );

        await adapter.reply(context, formatGameStart(bet));

        let won = false;

        while (answers.size < WORDLE_ROWS) {
          let prompt = await adapter.reply(
            context,
            formatBoard(answers, answers.size + 1),
          );

          let guess = await prompt.waitReply({
            timeout: 120_000,
            filter: (msg) => msg.author.id === context.author.id,
          });

          if (!guess) {
            await adapter.reply(context, formatTimeout(wordle));
            return;
          }

          let content = guess.context.content.trim().toLowerCase();

          if (content.length !== 5) {
            let key = `len-${context.platform}-${context.author.id}`;
            if (!NOTIFIED_USERS.has(key)) {
              await guess.reply(
                formatError("Guess must be exactly 5 letters."),
              );
              NOTIFIED_USERS.add(key);
              setTimeout(() => NOTIFIED_USERS.delete(key), 15_000);
            }
            continue;
          }

          if (![...wordleWords, ...nonWordleWords].includes(content)) {
            let key = `word-${content}-${context.platform}-${context.author.id}`;
            if (!WORDLE_NOTIFY.has(key)) {
              await guess.reply(
                formatError(`"${content.toUpperCase()}" is not a valid word.`),
              );
              WORDLE_NOTIFY.add(key);
              setTimeout(() => WORDLE_NOTIFY.delete(key), 15_000);
            }
            continue;
          }

          let res = validateWordle(content, wordle);
          answers.set(content, res.result.join(""));

          if (res.correct) {
            won = true;
            break;
          }
        }

        if (won) {
          let winnings = Math.floor(bet * WIN_MULTIPLIER);
          let updated = await Users.findOneAndUpdate(
            queryUser(context.platform, context.author.id),
            { $inc: { "economy.coins": winnings } },
            { session, returnDocument: "before" },
          );
          // updated is pre-winnings doc, but bet was already deducted earlier
          // so real old balance = updated.coins + bet
          let oldCoins = (updated?.economy?.coins ?? 0) + bet;
          let newCoins = oldCoins - bet + winnings;
          await adapter.reply(
            context,
            formatWin(answers, oldCoins, newCoins, winnings, bet),
          );
        } else {
          let updated = await Users.findOne(
            queryUser(context.platform, context.author.id),
            null,
            { session },
          );
          // bet already deducted, so old = current + bet
          let currentCoins = updated?.economy?.coins ?? 0;
          let oldCoins = currentCoins + bet;
          await adapter.reply(
            context,
            formatLose(answers, wordle, oldCoins, currentCoins, bet),
          );
        }
      });
    } catch {
    } finally {
      session.endSession();
    }
  },
});

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatError(msg: string): string {
  return [`‗   ↳ ❝ [ Wordle ] ¡! ❞`, `ೃ⁀➷ ${msg}`].join("\n");
}

function formatGameStart(bet: number): string {
  return [
    `‗   ↳ ❝ [ Wordle ] ¡! ❞`,
    `ೃ⁀➷ Game started! Bet: 🪙 ${bet}`,
    `         ◇─◇───◇─◇`,
    ``,
    `╭┈ rules ̗̀➛`,
    `┊ 🟩 right letter, right spot`,
    `┊ 🟨 right letter, wrong spot`,
    `┊ ⬛ not in word`,
    `┊`,
    `┊ 🎯 ${WORDLE_ROWS} attempts · 💰 ×${WIN_MULTIPLIER} on win`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Reply with your first guess!`,
  ].join("\n");
}

function formatBoard(answers: Map<string, string>, currentRow: number): string {
  let rows: string[] = [];

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
  let attempts = answers.size;
  let board = buildFinalBoard(answers);
  let flavor =
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
    `┊ 🏦 ${oldCoins} ➜ ${newCoins}`,
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
  let board = buildFinalBoard(answers);

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

function formatTimeout(wordle: string): string {
  return [
    `‗   ↳ ❝ [ Wordle — Timed Out ] ¡! ❞`,
    `ೃ⁀➷ 2 minutes up. Bet is forfeit.`,
    ``,
    `╭┈ reveal ̗̀➛`,
    `┊ 🔤 Word: ${wordle.toUpperCase()}`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Come back and try again!`,
  ].join("\n");
}

function buildFinalBoard(answers: Map<string, string>): string[] {
  let rows: string[] = [];
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

// ─── Game Logic ───────────────────────────────────────────────────────────────

function getRandomWordle(): string {
  let words = wordleWords as string[];
  return words[Math.floor(randomRange(0, words.length))];
}

function validateWordle(guess: string, answer: string): TXWordleResult {
  let result: TXWordleColor[] = new Array(5);
  let used: boolean[] = [false, false, false, false, false];
  let letterCount: Record<string, number> = {};
  let correct = true;

  for (const letter of answer) {
    letterCount[letter] = (letterCount[letter] || 0) + 1;
  }

  // pass 1 — greens
  for (let i = 0; i < 5; i++) {
    if (answer[i] === guess[i]) {
      result[i] = TXWordleColor.Green;
      letterCount[guess[i]]--;
      used[i] = true;
    }
  }

  // pass 2 — yellows + grays
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
