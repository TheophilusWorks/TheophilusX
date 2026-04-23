import TXCommand from "../../../core/command/TXCommand.js";
import { TXPlatform } from "../../../core/context/TXContext.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import { TXMessagePart } from "../../../core/message/TXMessagePart.js";

export default new TXCommand({
  name: "balance",
  description: "Check someone's balance",
  usage: "balance",
  minimumArguments: 0,
  aliases: ["bal"],
  cooldown: 10_000, // 10s
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let targetUser = ctx.mentions.length !== 0 ? ctx.mentions[0] : ctx.author;

    if (targetUser.isSelf) {
      adapter.reply(ctx, "I don't any form of data.");
      return;
    }

    if (ctx.author.isEveryone) {
      await adapter.reply(ctx, "@everyone don't any form of data.");
      return;
    }

    let parts: TXMessagePart[] = [];

    if (targetUser.id == ctx.author.id) {
      parts = await inspectSelf(ctx.author.id, ctx.platform);
    } else {
      parts = await inspectUser(
        targetUser.id,
        targetUser.displayName,
        ctx.platform,
      );
    }

    adapter.reply(ctx, { parts });
  },
});

async function inspectSelf(target: string, platform: TXPlatform) {
  let user = await Users.findOneAndUpdate(
    queryUser(platform, target),
    [
      {
        $set: {
          economy: {
            $cond: {
              if: { $eq: ["$economy", null] },
              then: initializeUserEconomy(),
              else: {
                $mergeObjects: [
                  "$economy",
                  {
                    totalBalance: {
                      $add: [
                        { $ifNull: ["$economy.coins", 0] },
                        { $ifNull: ["$economy.bankBalance", 0] },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after", updatePipeline: true },
  );

  return [
    text("⋆˚꩜｡ "),
    text(`Your Balance`),
    text("\n﹌﹌﹌﹌﹌﹌﹌﹌﹌\n"),
    text(`⛃⛂ Coins: ${user.economy?.coins}\n`),
    text(`🏦 Bank balance: ${user.economy?.bankBalance}\n`),
    text(`💰 Total balance: ${user.economy?.totalBalance}\n`),
  ];
}

async function inspectUser(
  target: string,
  displayName: string,
  platform: TXPlatform,
) {
  let user = await Users.findOneAndUpdate(
    queryUser(platform, target),
    [
      {
        $set: {
          economy: {
            $cond: {
              if: { $eq: ["$economy", null] },
              then: initializeUserEconomy(),
              else: {
                $mergeObjects: [
                  "$economy",
                  {
                    totalBalance: {
                      $add: [
                        { $ifNull: ["$economy.coins", 0] },
                        { $ifNull: ["$economy.bankBalance", 0] },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after", updatePipeline: true },
  );

  return [
    text("⋆˚꩜｡ "),
    mention(target, displayName),
    text(`'s Balance`),
    text("\n﹌﹌﹌﹌﹌﹌﹌﹌﹌\n"),
    text(`⛃⛂ Coins: ${user.economy?.coins}\n`),
    text(`🏦💸 Bank balance: ${user.economy?.bankBalance}\n`),
    text(`💰 Total balance: ${user.economy?.totalBalance}\n`),
  ];
}
