import mongoose from "mongoose";
import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import { initializeUser } from "../../utils/database/initializeUser.js";

export default new TXCommand({
  name: "give-coins",
  description: "Give someone money",
  usage: "give-coins <user> <amount>",
  minimumArguments: 1,
  aliases: ["gc"],
  cooldown: 5_000, // 5s
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
      await adapter.reply(ctx, "You cannot give money to youself.");
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

    // init both author && target
    await initializeUser(ctx);
    await initializeUser(ctx, { targetId: targetUser.id });

    let authorData = await Users.findOne(
      queryUser(ctx.platform, ctx.author.id),
    );

    // unreachable, only so typescripr shuts up
    if (!authorData) return;

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
          { $inc: { "economy.coins": amount } },
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
