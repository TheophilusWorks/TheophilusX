import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { initializeUser } from "../../utils/database/initializeUser.js";
import { text, mention } from "../../../core/message/TXMessageBuilder.js";
import mongoose from "mongoose";

const round2 = (n: number) => Math.round(n * 100) / 100;
const MAX_DAILY_STEALS = 5;

export default new TXCommand({
  name: "steal",
  description: "Steal coins from another user. Chance to fail and lose coins!",
  usage: "steal <user> <amount>",
  aliases: ["rob"],
  minimumArguments: 1,
  minimumMentions: 1,
  minimumGroupedArguments: 0,
  cooldown: 10_000,
  execute: async (ctx, { adapter, args }) => {
    const victim = ctx.mentions[0];
    const author = ctx.author;
    const amount = round2(parseFloat(args[0]));

    if (isNaN(amount) || amount <= 0) {
      await adapter.reply(ctx, "Invalid amount, enter a positive number.");
      return;
    }

    if (victim.id === author.id) {
      await adapter.reply(ctx, stealSelfMessage());
      return;
    }

    if (victim.isSelf) {
      await adapter.reply(ctx, {
        parts: [
          text(`‗   ↳ ❝ [ Steal ] ¡! ❞\nೃ⁀➷ Steal from `),
          mention(victim.id, victim.displayName),
          text(`? I'll remember that. 👀\n\n𓆩⟡𓆪 Nice try.`),
        ],
      });
      return;
    }

    const chance = getSuccessChance(amount, author.isAdmin);
    const penalty = round2(amount * 0.2);
    const fee = round2(penalty * 0.1);
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await initializeUser(ctx, { session });
        await initializeUser(ctx, { targetId: victim.id, session });

        const authorData = await Users.findOne(
          queryUser(ctx.platform, author.id),
        )
          .session(session)
          .lean();
        const victimData = await Users.findOne(
          queryUser(ctx.platform, victim.id),
        )
          .session(session)
          .lean();

        if (!authorData?.economy || !victimData?.economy) {
          throw new Error("Could not load user data.");
        }

        const authorCoins = authorData.economy.coins;
        const victimCoins = victimData.economy.coins;

        const now = Date.now();
        const lastStealAt = authorData.economy.lastStealAt ?? 0;
        const msSinceLastSteal = lastStealAt ? now - lastStealAt : Infinity;
        const windowExpired = msSinceLastSteal >= 24 * 60 * 60 * 1000;
        const effectiveStealCount = windowExpired
          ? 0
          : (authorData.economy.stealCount ?? 0);

        if (effectiveStealCount >= MAX_DAILY_STEALS) {
          const msUntilReset = 24 * 60 * 60 * 1000 - msSinceLastSteal;
          const hoursLeft = Math.floor(msUntilReset / (1000 * 60 * 60));
          const minutesLeft = Math.floor(
            (msUntilReset % (1000 * 60 * 60)) / (1000 * 60),
          );
          await adapter.reply(
            ctx,
            stealLimitMessage(effectiveStealCount, hoursLeft, minutesLeft),
          );
          return;
        }

        if (victimCoins <= 0) {
          await adapter.reply(ctx, stealBrokeMessage(victim.displayName));
          return;
        }

        if (victimCoins < amount) {
          await adapter.reply(
            ctx,
            `${victim.displayName} only has ${victimCoins} coins — lower your steal amount.`,
          );
          return;
        }

        if (authorCoins < penalty) {
          await adapter.reply(ctx, notEnoughMessage(penalty, authorCoins));
          return;
        }

        const roll = Math.random();
        const success = roll <= chance;
        const newStealCount = effectiveStealCount + 1;

        if (success) {
          await Users.updateOne(
            queryUser(ctx.platform, author.id),
            {
              $set: {
                "economy.stealCount": newStealCount,
                "economy.lastStealAt": now,
              },
              $inc: { "economy.coins": amount },
            },
            { session },
          );
          await Users.updateOne(
            queryUser(ctx.platform, victim.id),
            { $inc: { "economy.coins": -amount } },
            { session },
          );
          await adapter.reply(
            ctx,
            stealSuccessMessage(
              victim.displayName,
              amount,
              authorCoins,
              round2(authorCoins + amount),
              chance,
              newStealCount,
            ),
          );
        } else {
          await Users.updateOne(
            queryUser(ctx.platform, author.id),
            {
              $set: {
                "economy.stealCount": newStealCount,
                "economy.lastStealAt": now,
              },
              $inc: { "economy.coins": -penalty },
            },
            { session },
          );
          await Users.updateOne(
            queryUser(ctx.platform, victim.id),
            { $inc: { "economy.coins": fee } },
            { session },
          );
          await adapter.reply(
            ctx,
            stealFailMessage(
              victim.displayName,
              penalty,
              fee,
              authorCoins,
              round2(authorCoins - penalty),
              chance,
              newStealCount,
            ),
          );
        }
      });
    } catch (err) {
      let error = err as Error;
      await adapter.reply(
        ctx,
        `An error occurred during the steal attempt: ${error.message}... Aborting.`,
      );
    } finally {
      session.endSession();
    }
  },
});

function getSuccessChance(amount: number, isAdmin: boolean): number {
  if (isAdmin) return 0.65;
  const chance = 0.75 - 0.13 * Math.log10(Math.max(1, amount));
  return Math.min(0.55, Math.max(0.1, chance));
}

function stealSuccessMessage(
  victimName: string,
  stolen: number,
  oldBalance: number,
  newBalance: number,
  chance: number,
  stealCount: number,
) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞\nೃ⁀➷ Slick hands, empty pockets... theirs! 🤑\n        ◇─◇───◇─◇\n\n╭┈ Result : ̗̀➛\n┊ 🎯 Target   : ${victimName}\n┊ 💰 Stolen   : ${stolen} coins\n┊ 🎲 Chance   : ${(chance * 100).toFixed(0)}%\n╰─────────┈➤\n\n╭┈ Balance : ̗̀➛\n┊ 🪙 ${oldBalance} → ${newBalance} (+${stolen})\n╰────────────┈➤\n\n╭┈ Daily Steals : ̗̀➛\n┊ 📊 ${stealCount}/${MAX_DAILY_STEALS} used\n╰────────────┈➤\n\n𓆩⟡𓆪 Crime pays... this time.`;
}

function stealFailMessage(
  victimName: string,
  penalty: number,
  fee: number,
  oldBalance: number,
  newBalance: number,
  chance: number,
  stealCount: number,
) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞\nೃ⁀➷ Caught red-handed! You tripped on the way out. 😬\n        ◇─◇───◇─◇\n\n╭┈ Result : ̗̀➛\n┊ 🎯 Target   : ${victimName}\n┊ 💸 Penalty  : ${penalty} coins\n┊ 🧾 Fee (10%): ${fee} coins → returned to target\n┊ 🎲 Chance   : ${(chance * 100).toFixed(0)}%\n╰─────────┈➤\n\n╭┈ Balance : ̗̀➛\n┊ 🪙 ${oldBalance} → ${newBalance} (-${penalty})\n╰────────────┈➤\n\n╭┈ Daily Steals : ̗̀➛\n┊ 📊 ${stealCount}/${MAX_DAILY_STEALS} used\n╰────────────┈➤\n\n𓆩⟡𓆪 Better luck next time, clumsy.`;
}

function stealBrokeMessage(victimName: string) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞\nೃ⁀➷ You reached into their pockets and found... lint.\n        ◇─◇───◇─◇\n\n╭┈ Result : ̗̀➛\n┊ 🎯 Target   : ${victimName}\n┊ 🪙 Balance  : 0 coins\n╰─────────┈➤\n\n𓆩⟡𓆪 Can't rob the already broke.`;
}

function notEnoughMessage(penalty: number, authorCoins: number) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞\nೃ⁀➷ Hold on... you can't even afford to fail this heist.\n        ◇─◇───◇─◇\n\n╭┈ Info : ̗̀➛\n┊ 💸 Penalty if caught : ${penalty} coins\n┊ 🪙 Your balance      : ${authorCoins} coins\n╰─────────┈➤\n\n𓆩⟡𓆪 Get more coins before attempting this steal.`;
}

function stealSelfMessage() {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞\nೃ⁀➷ You attempt to steal from yourself...\n        ◇─◇───◇─◇\n\n𓆩⟡𓆪 That's just called moving money around, genius.`;
}

function stealLimitMessage(
  stealCount: number,
  hoursLeft: number,
  minutesLeft: number,
) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞\nೃ⁀➷ Slow down, you've been busy today...\n        ◇─◇───◇─◇\n\n╭┈ Daily Limit : ̗̀➛\n┊ 📊 Steals used : ${stealCount}/${MAX_DAILY_STEALS}\n┊ ⏳ Resets in   : ${hoursLeft}h ${minutesLeft}m\n╰─────────┈➤\n\n𓆩⟡𓆪 Come back later, klepto.`;
}
