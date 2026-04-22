import TXCommand from "../../../core/command/TXCommand.js";
import { sleep } from "../../../utils/sleep.js";

export default new TXCommand({
  name: "wheel",
  description: "Spins a wheel and announces the result",
  usage: "wheel <user1> <user2> ...",
  minimumArguments: 2,
  minimumMentions: 0,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  execute: async (ctx, { adapter, args }) => {
    let winnerIndex = Math.floor(Math.random() * args.length);
    let winner = args[winnerIndex];

    await adapter.reply(ctx, `The wheel is spinning...`);
    await sleep(0, 1000);

    let reply = await adapter.reply(ctx, "And the winner is...");
    let reveal = await reply.waitReply({
      timeout: 60_000,
      filter: (m) => m.author.id === ctx.author.id,
    });

    if (!reveal) return;

    reveal.reply(`The winner is... ${winner}! Congratulations!`);
  },
});
