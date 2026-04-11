import TXCommand from "../../../core/command/TXCommand.js";
import { randomRange } from "../../../utils/randomRange.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { text, mention } from "../../../core/message/TXMessageBuilder.js";
import ms from "ms";

interface TXWork {
  work: string;
  pay: number;
}

export default new TXCommand({
  name: "work",
  description: "Work a part-time job and claim your rewards",
  usage: "work",
  minimumArguments: 0,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
    let { platform, author } = context;
    let now = new Date();
    const nextWork = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    let work = getRandomWork();
    let reward = Math.round(work.pay);

    // ensure user exists first
    await Users.findOneAndUpdate(
      queryUser(platform, author.id),
      {
        $setOnInsert: {
          economy: { coins: 0, bankBalance: 0, nextWork: null },
        },
      },
      { upsert: true },
    );

    let result = await Users.findOneAndUpdate(
      {
        ...queryUser(platform, author.id),
        $or: [
          { "economy.nextWork": null },
          { "economy.nextWork": { $lt: now } },
        ],
      },
      {
        $inc: { "economy.coins": reward },
        $set: { "economy.nextWork": nextWork },
      },
    );

    if (!result) {
      const user = await Users.findOne(queryUser(platform, author.id));
      const timeLeft =
        (user?.economy?.nextWork?.getTime() ?? 0) - now.getTime();

      await adapter.reply(context, {
        parts: [
          text(`
🌙 ❝ On Break ❞
⌯ You're still resting, `),
          mention(author.id, author.displayName),
          text(`

◈ Next shift : ${ms(timeLeft)}

𓆩⟡𓆪 Go touch some grass in the meantime.
`),
        ],
      });
      return;
    }

    const oldCoins = result?.economy?.coins ?? 0;
    const newCoins = oldCoins + reward;

    await adapter.reply(context, {
      parts: [
        text(`
💼 ❝ Work Reward ❞
⌯ ${work.work}

◈ Before  : ${oldCoins} 🪙
◈ Earned  : +${reward} 🪙
◈ After   : ${newCoins} 🪙

𓆩⟡𓆪 Next shift in 6 hours.
`),
      ],
    });
  },
});

function getRandomWork(): TXWork {
  let works = [
    {
      work: "Delivered packages around the neighborhood",
      pay: randomRange(350, 500, true),
    },
    {
      work: "Fixed a client's buggy website",
      pay: randomRange(700, 1000, true),
    },
    {
      work: "Wrote a short article for a blog",
      pay: randomRange(250, 400, true),
    },
    {
      work: "Designed a logo for a small business",
      pay: randomRange(600, 950, true),
    },
    {
      work: "Tutored a student in math for two hours",
      pay: randomRange(300, 400, true),
    },
    {
      work: "Repaired a broken fence",
      pay: randomRange(450, 550, true),
    },
    {
      work: "Photographed a local event",
      pay: randomRange(600, 800, true),
    },
    {
      work: "Cleaned and detailed a car",
      pay: randomRange(200, 300, true),
    },
    {
      work: "Set up a home Wi-Fi network",
      pay: randomRange(350, 500, true),
    },
    {
      work: "Walked dogs for a busy family",
      pay: randomRange(200, 350, true),
    },
    {
      work: "Painted a room in someone's house",
      pay: randomRange(800, 1000, true),
    },
    {
      work: "Transcribed an hour-long podcast episode",
      pay: randomRange(250, 400, true),
    },
    {
      work: "Fixed a plumbing leak under the sink",
      pay: randomRange(400, 650, true),
    },
    {
      work: "Proofread a short business report",
      pay: randomRange(200, 275, true),
    },
    {
      work: "Assembled furniture from flat-pack boxes",
      pay: randomRange(300, 450, true),
    },
  ];

  return works[Math.floor(randomRange(0, works.length))];
}
