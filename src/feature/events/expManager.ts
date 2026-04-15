import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../core/database/model/Users.js";
import { randomRange } from "../../utils/randomRange.js";
import { text, mention } from "../../core/message/TXMessageBuilder.js";
import { TXPlatform } from "../../core/context/TXContext.js";

let COOLDOWN_USERS = new TXCooldownManager();
let NEXT_EXP_COOLDOWN = 60 * 1000;

export default new TXEventBuilder("messageCreate", async (ctx, adapter) => {
  if (ctx.author.isSelf) return;

  let key = TXCooldownManager.getCooldownKey("exp", ctx, false);
  let cd = COOLDOWN_USERS.getRemainingCooldown(key);
  if (cd > 0) return;

  try {
    await Users.findOneAndUpdate(
      queryUser(ctx.platform, ctx.author.id),
      { $setOnInsert: { economy: initializeUserEconomy() } },
      { upsert: true },
    );

    let expGain = Math.round(randomRange(50, 80, true));
    const result = await addExp(ctx.platform, ctx.author.id, expGain);
    COOLDOWN_USERS.setCooldown(key, NEXT_EXP_COOLDOWN);

    if (result?.leveledUp) {
      await adapter.reply(ctx, {
        parts: [
          text(
            `
‗   ↳ ❝ [ Level Up! ] ¡! ❞
ೃ⁀➷ Congrats, `,
          ),
          mention(ctx.author.id, ctx.author.displayName),
          text(`. you leveled up!
         ◇─◇───◇─◇

╭┈ progress : ̗̀➛
┊ ⭐ Level: ${result.oldLevel} ➜ ${result.level}
┊ ✨ Exp: ${formatExp(result.oldExp ?? 500)} ➜ ${formatExp(result.exp ?? 1000)}
╰─────────┈➤

𓆩⟡𓆪 Keep chatting to level up faster!
`),
        ],
      });
    }
  } catch {}
});

async function addExp(platform: TXPlatform, userId: string, amount: number) {
  const user = await Users.findOneAndUpdate(
    queryUser(platform, userId),
    { $inc: { "economy.exp": amount, "economy.totalExp": amount } },
    { returnDocument: "after" },
  );

  if (!user)
    return { level: 0, exp: 0, oldLevel: 0, oldExp: 0, leveledUp: false };

  let exp = user.economy?.exp ?? 0;
  let level = user.economy?.level ?? 0;
  let leveledUp = false;

  const oldExp = exp - amount;
  const oldLevel = level;

  while (exp >= requiredXP(level + 1)) {
    exp -= requiredXP(level + 1);
    level++;
    leveledUp = true;
  }

  if (leveledUp) {
    await Users.updateOne(queryUser(platform, userId), {
      $set: { "economy.exp": exp, "economy.level": level },
    });
  }

  return { level, exp, oldLevel, oldExp, leveledUp };
}

function requiredXP(level: number): number {
  return 5 * level ** 2 + 50 * level + level * 1000;
}

function formatExp(exp: number): string {
  if (exp >= 1_000_000) return `${(exp / 1_000_000).toFixed(1)}M`;
  if (exp >= 1_000) return `${(exp / 1_000).toFixed(1)}K`;
  return exp.toString();
}
