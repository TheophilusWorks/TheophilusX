import TXCommand from "../../../core/command/TXCommand.js";
import { randomRange } from "../../../utils/randomRange.js";
import { sleep } from "../../../utils/sleep.js";

export default new TXCommand({
  name: "giveaway",
  description: "Lists all users and randomly selects a winner",
  usage: "giveaway <winners count> <title>",
  minimumArguments: 1,
  minimumMentions: 0,
  cooldown: 5_000, // 5s
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
    await sleep(0, 5000);
    let winners = getWinners(contestants, winnersCount);
    let winnerMsg = formatWinnersMsg(title, winners);
    await adapter.reply(ctx, winnerMsg);
  },
});

function getWinners(contestants: string[], winnersCount: number) {
  let winners: string[] = [];

  for (let i = 0; i < winnersCount; i++) {
    let winnerIndex = randomRange(0, contestants.length);
    winners.push(contestants[winnerIndex]);
  }

  return winners;
}

function formatAnnouncementMsg(
  winnersCount: number,
  title: string,
  contestants: string[],
) {
  let c = contestants.map((u, i) => `┊ 👥 ${i + 1}. ${u}`).join("\n");
  return `
‗   ↳ ❝ [ Giveaway ] ¡! ❞
ೃ⁀➷ {user} is hosting a giveaway!
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
