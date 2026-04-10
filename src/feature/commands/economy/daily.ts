import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { randomRange } from "../../../utils/randomRange.js";
import {
  text,
  straightDivider,
  mention,
} from "../../../core/message/TXMessageBuilder.js";
import ms from "ms";

export default new TXCommand({
  name: "daily",
  description: "Claim your daily rewards here",
  usage: "daily",
  minimumArguments: 0,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
    let { platform, author } = context;
    let now = new Date();
    const nextDaily = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reward = Math.round(randomRange(200, 1000, true));

    // ensure user exists first
    await Users.findOneAndUpdate(
      queryUser(platform, author.id),
      {
        $setOnInsert: {
          economy: { coins: 0, bankBalance: 0, nextDaily: null },
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
        $inc: { "economy.coins": reward },
        $set: { "economy.nextDaily": nextDaily },
      },
    );

    if (!result) {
      const user = await Users.findOne(queryUser(platform, author.id));
      const timeLeft =
        (user?.economy?.nextDaily?.getTime() ?? 0) - now.getTime();

      await adapter.reply(context, {
        parts: [
          text(`
‗   ↳ ❝ [ Daily Reward ] ¡! ❞
ೃ⁀➷ You've already claimed your daily,  `),
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

    await adapter.reply(context, {
      parts: [
        text(`
‗   ↳ ❝ [ Daily Reward ] ¡! ❞
ೃ⁀➷ You've claimed your daily reward!
         ◇─◇───◇─◇

╭┈ reward : ̗̀➛
┊ 🪙 Coins: ${oldCoins} ➜ ${newCoins}
╰─────────┈➤

𓆩⟡𓆪 Come back tomorrow for more!
`),
      ],
    });
  },
});
