import mongoose from "mongoose";
import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import { initializeUser } from "../../utils/database/initializeUser.js";

const MAX_COINS_ACCEPT = 5;
const COOLDOWN_HOURS = 24;

export default new TXCommand({
  name: "give-coins",
  description: "Give someone money",
  usage: "give-coins <user> <amount>",
  minimumArguments: 1,
  aliases: ["gc"],
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    let targetUser = ctx.mentions.length !== 0 ? ctx.mentions[0] : ctx.author;

    if (targetUser.isSelf) {
      await adapter.reply(ctx, "I don't any form of data.");
      return;
    }

    if (ctx.author.isEveryone) {
      await adapter.reply(ctx, "@everyone don't any form of data.");
      return;
    }

    if (targetUser.id == ctx.author.id) {
      await adapter.reply(ctx, "You cannot give money to yourself.");
      return;
    }

    let amount = parseFloat(args[0]);

    if (isNaN(amount) || amount <= 0) {
      await adapter.reply(
        ctx,
        "Please enter a non-negative number as the amount",
      );
      return;
    }

    await initializeUser(ctx);
    await initializeUser(ctx, { targetId: targetUser.id });

    let authorData = await Users.findOne(
      queryUser(ctx.platform, ctx.author.id),
    );
    let targetData = await Users.findOne(
      queryUser(ctx.platform, targetUser.id),
    );

    if (!authorData || !targetData) return;

    if (authorData.economy!.coins < amount) {
      await adapter.reply(ctx, {
        parts: [
          text("You dont have enough balance to give "),
          mention(targetUser.id, targetUser.displayName),
          text(` ${amount} coins`),
        ],
      });
      return;
    }

    const now = Date.now();
    const nextCoinsAccept = targetData.economy!.nextCoinsAccept ?? 0;
    const coinsAcceptCount = targetData.economy!.coinsAcceptCount ?? 0;

    if (coinsAcceptCount >= MAX_COINS_ACCEPT) {
      const remaining = nextCoinsAccept - now;

      if (remaining > 0) {
        const hours = Math.floor(remaining / 3_600_000);
        const minutes = Math.floor((remaining % 3_600_000) / 60_000);
        await adapter.reply(ctx, {
          parts: [
            mention(targetUser.id, targetUser.displayName),
            text(
              ` can't accept more coins right now. Try again in ${hours}h ${minutes}m.`,
            ),
          ],
        });
        return;
      }

      // cooldown passed, reset
      await Users.findOneAndUpdate(queryUser(ctx.platform, targetUser.id), {
        $set: { "economy.coinsAcceptCount": 0, "economy.nextCoinsAccept": 0 },
      });
    }

    const isFirstAccept = coinsAcceptCount === 0 || nextCoinsAccept === 0;

    let session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const authorData = await Users.findOneAndUpdate(
          {
            ...queryUser(ctx.platform, ctx.author.id),
            "economy.coins": { $gte: amount },
          },
          { $inc: { "economy.coins": -amount } },
          { session, returnDocument: "after" },
        );

        if (!authorData) {
          await adapter.reply(ctx, {
            parts: [
              text("You dont have enough balance to give "),
              mention(targetUser.id, targetUser.displayName),
              text(` ${amount} coins`),
            ],
          });
          return;
        }

        await Users.findOneAndUpdate(
          queryUser(ctx.platform, targetUser.id),
          {
            $inc: {
              "economy.coins": amount,
              "economy.coinsAcceptCount": 1,
            },
            ...(isFirstAccept && {
              $set: {
                "economy.nextCoinsAccept": now + COOLDOWN_HOURS * 3_600_000,
              },
            }),
          },
          { session },
        );

        await adapter.reply(
          ctx,
          giveCoinsMessage(
            amount,
            ctx.author.displayName,
            targetUser.displayName,
            authorData.economy!.coins,
          ),
        );
      });
    } catch (err) {
      let e = err as Error;
      await adapter.reply(
        ctx,
        formatError(
          `Something went wrong while sending your money.\n${e.message}\n\nTransaction aborted`,
        ),
      );
    } finally {
      await session.endSession();
    }
  },
});

function formatError(msg: string): string {
  return [`‗   ↳ ❝ [ Give Coins ] ¡! ❞`, `ೃ⁀➷ ${msg}`].join("\n");
}

function giveCoinsMessage(
  amount: number,
  sender: string,
  recipient: string,
  newBalance: number,
) {
  return [
    `‗   ↳ ❝ [ Give Coins ] ¡! ❞`,
    `ೃ⁀➷ Transfer initiated! Amount: 🪙 ${amount}`,
    `         ◇─◇───◇─◇`,
    ``,
    `╭┈ details ̗̀➛`,
    `┊ 👤 From: ${sender}`,
    `┊ 👤 To: ${recipient}`,
    `┊ 🪙 Amount: ${amount}`,
    `┊ 💼 Your balance: ${newBalance}`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Transfer complete!`,
  ].join("\n");
}
