import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { randomRange } from "../../../utils/randomRange.js";
import { text, mention } from "../../../core/message/TXMessageBuilder.js";
import { initializeUser } from "../../utils/database/initializeUser.js";
import ms from "ms";

export default new TXCommand({
  name: "daily",
  description: "Claim your daily rewards here",
  usage: "daily",
  minimumArguments: 0,
  cooldown: 10_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let { platform, author } = ctx;
    let now = Date.now();
    const nextDaily = now + 24 * 60 * 60 * 1000;
    const reward = Math.round(randomRange(200, 1000, true));
    const expReward = Math.round(randomRange(300, 500, true));

    await initializeUser(ctx);

    let result = await Users.findOneAndUpdate(
      {
        ...queryUser(platform, author.id),
        $or: [
          { "economy.nextDaily": null },
          { "economy.nextDaily": 0 },
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
      const timeLeft = (user?.economy?.nextDaily ?? 0) - now;

      await adapter.reply(ctx, {
        parts: [
          text(
            `‗   ↳ ❝ [ Daily Rewards ] ¡! ❞\nೃ⁀➷ You've already claimed your daily rewards,  `,
          ),
          mention(author.id, author.displayName),
          text(
            `\n         ◇─◇───◇─◇\n\n╭┈ cooldown : ̗̀➛\n┊ ⏳ Try again after: ${ms(timeLeft)}\n╰─────────┈➤`,
          ),
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
        text(
          `‗   ↳ ❝ [ Daily Rewards ] ¡! ❞\nೃ⁀➷ You've claimed your daily rewards!\n         ◇─◇───◇─◇\n\n╭┈ reward : ̗̀➛\n┊ 🪙 Coins: ${oldCoins} ➜ ${newCoins}\n┊ ⭐ Exp: ${oldExp} ➜ ${newExp}\n╰─────────┈➤\n\n𓆩⟡𓆪 Come back tomorrow for more!\n`,
        ),
      ],
    });
  },
});
