import TXCommand from "../../../core/command/TXCommand.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { RankCardBuilder, Font } from "canvacord";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

Font.loadDefault();

export default new TXCommand({
  name: "exp",
  description: "Check your current EXP and level",
  usage: "exp [user]",
  aliases: ["xp", "level", "rank"],
  cooldown: 5_000,
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let targetUser = ctx.mentions.length !== 0 ? ctx.mentions[0] : ctx.author;

    if (targetUser.isSelf) {
      await adapter.reply(ctx, "I don't have any economy data.");
      return;
    }

    await Users.findOneAndUpdate(
      queryUser(ctx.platform, targetUser.id),
      { $setOnInsert: { economy: initializeUserEconomy() } },
      { upsert: true },
    );

    const userData = await Users.findOne(
      queryUser(ctx.platform, targetUser.id),
    );
    if (!userData) return;

    const level = userData.economy?.level ?? 0;
    const exp = userData.economy?.exp ?? 0;
    const currentLevelReq = requiredXP(level + 1);

    const avatarURL =
      targetUser.avatarURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.displayName)}&background=7c3aed&color=ffffff&size=256`;

    const card = new RankCardBuilder()
      .setUsername(targetUser.displayName)
      .setDisplayName(targetUser.displayName)
      .setAvatar(avatarURL)
      .setCurrentXP(exp)
      .setRequiredXP(currentLevelReq)
      .setLevel(level)
      .setProgressCalculator(() => {
        return Math.min(Math.floor((exp / currentLevelReq) * 100), 100);
      });

    const image = await card.build({ format: "png" });
    const tmpPath = path.join(
      os.tmpdir(),
      `rank_${targetUser.id}_${Date.now()}.png`,
    );

    try {
      await fs.writeFile(tmpPath, image);
      await adapter.reply(ctx, {
        attachments: [tmpPath],
      });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  },
});

function requiredXP(level: number): number {
  return 5 * level ** 2 + 50 * level + level * 1000;
}
