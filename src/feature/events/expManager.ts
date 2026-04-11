import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../core/database/model/Users.js";
import { randomRange } from "../../utils/randomRange.js";
import { TXPlatform } from "../../core/context/TXContext.js";

let COOLDOWN_USERS = new TXCooldownManager();
let NEXT_EXP_COOLDOWN = 60 * 1000;

export default new TXEventBuilder("messageCreate", async (ctx, adapter) => {
  let key = TXCooldownManager.getCooldownKey("exp", ctx, false);
  let cd = COOLDOWN_USERS.getRemainingCooldown(key);
  if (cd > 0) return;

  try {
    await Users.findOneAndUpdate(
      queryUser(ctx.platform, ctx.author.id),
      { $setOnInsert: { economy: initializeUserEconomy() } },
      { upsert: true },
    );

    let expGain = Math.round(randomRange(20, 30, true));
    const result = await addExp(ctx.platform, ctx.author.id, expGain);
    COOLDOWN_USERS.setCooldown(key, NEXT_EXP_COOLDOWN);

    if (result?.leveledUp) {
      // TODO: Notification
    }
  } catch {}
});

async function addExp(platform: TXPlatform, userId: string, amount: number) {
  const user = await Users.findOneAndUpdate(
    queryUser(platform, userId),
    { $inc: { "economy.exp": amount, "economy.totalExp": amount } },
    { new: true },
  );

  if (!user) return;

  let exp = user.economy?.exp ?? 0;
  let level = user.economy?.level ?? 0;
  let leveledUp = false;

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

  return { level, exp, leveledUp };
}

function requiredXP(level: number): number {
  return 5 * level ** 2 + 50 * level + level * 1000;
}

function getLevelFromExp(totalExp: number): number {
  const A = 5;
  const B = 1050; // 50 + 1000 (linear coefficients combined)
  const discriminant = B ** 2 + 4 * A * totalExp;
  return Math.floor((-B + Math.sqrt(discriminant)) / (2 * A));
}
