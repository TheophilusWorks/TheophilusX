import TXCommand from "../../../core/command/TXCommand.js";
import { randomRange } from "../../../utils/randomRange.js";
import { sleep } from "../../../utils/sleep.js";

export default new TXCommand({
  name: "giveaway",
  description: "Lists all users and randomly selects a winner",
  usage: "giveaway <winners count> <title>",
  minimumArguments: 1,
  minimumMentions: 0,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async (ctx, { adapter, args }) => {
    let winnersCount = parseInt(args[0]);

    if (isNaN(winnersCount) || winnersCount < 1) {
      await adapter.reply(
        ctx,
        "Please provide a valid number of winners (at least 1).",
      );
      return;
    }

    let title = args.slice(1).join(" ");
    let contestants: string[] = [];
    let giveawayEnded = false;


    while (!giveawayEnded) {
      let announcementMsg = formatAnnouncementMsg(
        winnersCount,
        title,
        contestants,
        ctx.author.displayName,
      );
      let reply = await adapter.reply(ctx, announcementMsg);
      let shouldReannounce = false;

      while (!shouldReannounce && !giveawayEnded) {
        let entry = await reply.waitReply({ timeout: 60_000 });

        if (!entry) {
          await adapter.reply(
            ctx,
            "Entry period has ended. Drawing winners...",
          );
          giveawayEnded = true;
          break;
        }

        if (entry.context.author.id === ctx.author.id) {
          await adapter.reply(
            ctx,
            "The host has started the giveaway. Drawing winners...",
          );
          giveawayEnded = true;
          break;
        }

        if (!contestants.includes(entry.context.author.displayName)) {
          contestants.push(entry.context.author.displayName);
          shouldReannounce = true;
        }
      }
    }

    await adapter.reply(ctx, "And the winner(s) is/are...");
    await sleep(2000, 5000);
    let winners = getWinners(contestants, winnersCount);
    let winnerMsg = formatWinnersMsg(title, winners);
    await adapter.reply(ctx, winnerMsg);
  },
});

function getWinners(contestants: string[], winnersCount: number) {
  const count = Math.min(winnersCount, contestants.length);

  const pool = [...contestants];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(randomRange(0, i, true));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}

function formatAnnouncementMsg(
  winnersCount: number,
  title: string,
  contestants: string[],
  hostName: string,
) {
  const c =
    contestants.length > 0
      ? contestants.map((u, i) => `┊ 👥 ${i + 1}. ${u}`).join("\n")
      : "┊ 🕳️ No contestants yet — be the first!";

  return `
‗   ↳ ❝ [ Giveaway ] ¡! ❞
ೃ⁀➷ ${hostName} is hosting a giveaway!
         ◇─◇───◇─◇

╭┈ prize ̗̀➛
┊ 🎁 ${title}
╰─────────┈➤

╭┈ contestants ̗̀➛
${c}
╰─────────┈➤

╭┈ how to join ̗̀➛
┊ 💬 Reply to this message to enter!
┊ 🏆 ${winnersCount} winner(s) will be drawn.
╰─────────┈➤

𓆩⟡𓆪 Good luck to all participants!
`;
}

function formatWinnersMsg(title: string, winners: string[]) {
  let w = winners.map((u, i) => `┊ 🏆 ${i + 1}. ${u}`).join("\n");
  return `
‗   ↳ ❝ [ Giveaway Ended ] ¡! ❞
ೃ⁀➷ The giveaway has concluded!
         ◇─◇───◇─◇

╭┈ prize ̗̀➛
┊ 🎁 ${title}
╰─────────┈➤

╭┈ winner(s) ̗̀➛
${w}
╰─────────┈➤

𓆩⟡𓆪 Congratulations to all winners!
`;
}
