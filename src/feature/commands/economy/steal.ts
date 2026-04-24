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

    // Penalty = 20% of wanted amount
    const penalty = round2(amount * 0.2);
    // Fee = 10% of penalty, goes to victim
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

        // 24h rolling window for steal count
        const now = Date.now();
        const lastStealAt = authorData.economy.lastStealAt
          ? new Date(authorData.economy.lastStealAt).getTime()
          : null;
        const msSinceLastSteal = lastStealAt ? now - lastStealAt : Infinity;
        const windowExpired = msSinceLastSteal >= 24 * 60 * 60 * 1000;
        const effectiveStealCount = windowExpired
          ? 0
          : (authorData.economy.stealCount ?? 0);

        // Check daily steal limit
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
                "economy.lastStealAt": new Date(now),
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
                "economy.lastStealAt": new Date(now),
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
  if (isAdmin) return 0.7;
  const chance = 0.9 - 0.1 * Math.log10(Math.max(1, amount));
  return Math.min(0.7, Math.max(0.1, chance));
}

function stealSuccessMessage(
  victimName: string,
  stolen: number,
  oldBalance: number,
  newBalance: number,
  chance: number,
  stealCount: number,
) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞
ೃ⁀➷ Slick hands, empty pockets... theirs! 🤑
        ◇─◇───◇─◇

╭┈ Result : ̗̀➛
┊ 🎯 Target   : ${victimName}
┊ 💰 Stolen   : ${stolen} coins
┊ 🎲 Chance   : ${(chance * 100).toFixed(0)}%
╰─────────┈➤

╭┈ Balance : ̗̀➛
┊ 🪙 ${oldBalance} → ${newBalance} (+${stolen})
╰────────────┈➤

╭┈ Daily Steals : ̗̀➛
┊ 📊 ${stealCount}/${MAX_DAILY_STEALS} used
╰────────────┈➤

𓆩⟡𓆪 Crime pays... this time.`;
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
  return `‗   ↳ ❝ [ Steal ] ¡! ❞
ೃ⁀➷ Caught red-handed! You tripped on the way out. 😬
        ◇─◇───◇─◇

╭┈ Result : ̗̀➛
┊ 🎯 Target   : ${victimName}
┊ 💸 Penalty  : ${penalty} coins
┊ 🧾 Fee (10%): ${fee} coins → returned to target
┊ 🎲 Chance   : ${(chance * 100).toFixed(0)}%
╰─────────┈➤

╭┈ Balance : ̗̀➛
┊ 🪙 ${oldBalance} → ${newBalance} (-${penalty})
╰────────────┈➤

╭┈ Daily Steals : ̗̀➛
┊ 📊 ${stealCount}/${MAX_DAILY_STEALS} used
╰────────────┈➤

𓆩⟡𓆪 Better luck next time, clumsy.`;
}

function stealBrokeMessage(victimName: string) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞
ೃ⁀➷ You reached into their pockets and found... lint.
        ◇─◇───◇─◇

╭┈ Result : ̗̀➛
┊ 🎯 Target   : ${victimName}
┊ 🪙 Balance  : 0 coins
╰─────────┈➤

𓆩⟡𓆪 Can't rob the already broke.`;
}

function notEnoughMessage(penalty: number, authorCoins: number) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞
ೃ⁀➷ Hold on... you can't even afford to fail this heist.
        ◇─◇───◇─◇

╭┈ Info : ̗̀➛
┊ 💸 Penalty if caught : ${penalty} coins
┊ 🪙 Your balance      : ${authorCoins} coins
╰─────────┈➤

𓆩⟡𓆪 Get more coins before attempting this steal.`;
}

function stealSelfMessage() {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞
ೃ⁀➷ You attempt to steal from yourself...
        ◇─◇───◇─◇

𓆩⟡𓆪 That's just called moving money around, genius.`;
}

function stealLimitMessage(
  stealCount: number,
  hoursLeft: number,
  minutesLeft: number,
) {
  return `‗   ↳ ❝ [ Steal ] ¡! ❞
ೃ⁀➷ Slow down, you've been busy today...
        ◇─◇───◇─◇

╭┈ Daily Limit : ̗̀➛
┊ 📊 Steals used : ${stealCount}/${MAX_DAILY_STEALS}
┊ ⏳ Resets in   : ${hoursLeft}h ${minutesLeft}m
╰─────────┈➤

𓆩⟡𓆪 Come back later, klepto.`;
}
