import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { RankCardBuilder, Font } from "canvacord";
import fs from "fs/promises";
import path from "path";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import { CACHE_DIR } from "../../../core/TheophilusX.js";
import { initializeUser } from "../../utils/database/initializeUser.js";
import { Emoji } from "../../constants/emojis.js";

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
    await adapter.reactEmoji(ctx, Emoji.Loading);
    let targetUser = ctx.mentions.length !== 0 ? ctx.mentions[0] : ctx.author;

    if (targetUser.isSelf) {
      await adapter.reply(ctx, "I don't have any economy data.");
      return;
    }

    if (ctx.author.isEveryone) {
      await adapter.reply(ctx, "@everyone don't any form of data.");
      return;
    }

    await initializeUser(ctx);

    const userData = await Users.findOne(
      queryUser(ctx.platform, targetUser.id),
    );
    if (!userData) return;

    const level = userData.economy?.level ?? 0;
    const exp = userData.economy?.exp ?? 0;
    const totalExp = userData.economy?.totalExp ?? 0;
    const currentLevelReq = requiredXP(level + 1);

    const avatarURL =
      targetUser.avatarURL

    const card = new RankCardBuilder()
      .setUsername(targetUser.displayName)
      .setDisplayName(targetUser.displayName)
      .setAvatar(avatarURL)
      .setCurrentXP(exp)
      .setRequiredXP(currentLevelReq)
      .setLevel(level)
      .setProgressCalculator(() =>
        Math.min(Math.floor((exp / currentLevelReq) * 100), 100),
      );

    const image = await card.build({ format: "png" });
    const tmpPath = path.join(
      CACHE_DIR,
      `rank_${targetUser.id}_${Date.now()}.png`,
    );

    try {
      await fs.writeFile(tmpPath, image);
      await adapter.reactEmoji(ctx, Emoji.Done);
      await adapter.reply(ctx, {
        attachments: [tmpPath],
        parts: [
          text(`‗   ↳ ❝ [ EXP Card ] ¡! ❞\nೃ⁀➷ `),
          mention(targetUser.id, targetUser.displayName),
          text(`'s stats!
         ◇─◇───◇─◇

╭┈ progress : ̗̀➛
┊ ⭐ Level   : ${level}
┊ ✨ Exp     : ${formatExp(exp)} / ${formatExp(currentLevelReq)}
┊ 💫 Total   : ${formatExp(totalExp)}
╰─────────┈➤

𓆩⟡𓆪 Keep chatting to level up faster!
`),
        ],
      });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  },
});

function requiredXP(level: number): number {
  return 5 * level ** 2 + 50 * level + level * 1000;
}

function formatExp(exp: number): string {
  if (exp >= 1_000_000) return `${(exp / 1_000_000).toFixed(1)}M`;
  if (exp >= 1_000) return `${(exp / 1_000).toFixed(1)}K`;
  return exp.toString();
}
