import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { randomRange } from "../../../utils/randomRange.js";
import { text, mention } from "../../../core/message/TXMessageBuilder.js";
import ms from "ms";

export default new TXCommand({
  name: "daily",
  description: "Claim your daily rewards here",
  usage: "daily",
  minimumArguments: 0,
  cooldown: 10_000, // 10s
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let { platform, author } = ctx;
    let now = new Date();
    const nextDaily = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reward = Math.round(randomRange(200, 1000, true));
    const expReward = Math.round(randomRange(300, 500, true));

    // ensure user exists first
    await Users.findOneAndUpdate(
      queryUser(platform, author.id),
      {
        $setOnInsert: {
          economy: initializeUserEconomy(),
        },
      },
      { upsert: true },
    );

    let result = await Users.findOneAndUpdate(
      {
        ...queryUser(platform, author.id),
        $or: [
          { "economy.nextDaily": null },
          { "economy.nextDaily": { $lt: now } },
        ],
      },
      {
        $inc: {
          "economy.coins": reward,
          "economy.exp": expReward,
          "economy.totalExp": expReward,
        },
        $set: { "economy.nextDaily": nextDaily },
      },
    );

    if (!result) {
      const user = await Users.findOne(queryUser(platform, author.id));
      const timeLeft =
        (user?.economy?.nextDaily?.getTime() ?? 0) - now.getTime();

      await adapter.reply(ctx, {
        parts: [
          text(`
‗   ↳ ❝ [ Daily Rewards ] ¡! ❞
ೃ⁀➷ You've already claimed your daily rewards,  `),
          mention(author.id, author.displayName),
          text(`
         ◇─◇───◇─◇

╭┈ cooldown : ̗̀➛
┊ ⏳ Try again after: ${ms(timeLeft)}
╰─────────┈➤`),
        ],
      });
      return;
    }

    const oldCoins = result?.economy?.coins ?? 0;
    const newCoins = oldCoins + reward;

    const oldExp = result?.economy?.exp ?? 0;
    const newExp = oldExp + expReward;

    await adapter.reply(ctx, {
      parts: [
        text(`
‗   ↳ ❝ [ Daily Rewards ] ¡! ❞
ೃ⁀➷ You've claimed your daily rewards!
         ◇─◇───◇─◇

╭┈ reward : ̗̀➛
┊ 🪙 Coins: ${oldCoins} ➜ ${newCoins}
┊ ⭐ Exp: ${oldExp} ➜ ${newExp}
╰─────────┈➤

𓆩⟡𓆪 Come back tomorrow for more!
`),
      ],
    });
  },
});
