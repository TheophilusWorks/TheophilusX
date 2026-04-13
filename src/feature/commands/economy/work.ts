import TXCommand from "../../../core/command/TXCommand.js";
import { randomRange } from "../../../utils/randomRange.js";
import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { text, mention } from "../../../core/message/TXMessageBuilder.js";
import ms from "ms";

interface TXWork {
  work: string;
  pay: number;
  exp: number;
}

export default new TXCommand({
  name: "work",
  description: "Work a part-time job and claim your rewards",
  usage: "work",
  minimumArguments: 0,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async ({ adapter, context }) => {
    let { platform, author } = context;
    let now = new Date();
    const nextWork = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    let work = getRandomWork();
    let reward = Math.round(work.pay);
    let expReward = Math.round(work.exp);

    // ensure user exists first
    await Users.findOneAndUpdate(
      queryUser(platform, author.id),
      {
        $setOnInsert: {
          economy: initializeUserEconomy(),
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
        $inc: {
          "economy.coins": reward,
          "economy.exp": expReward,
          "economy.totalExp": expReward,
        },
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

    const oldExp = result?.economy?.exp ?? 0;
    const newExp = oldExp + expReward;

    await adapter.reply(context, {
      parts: [
        text(`
💼 ❝ Work Rewards ❞
⌯ ${work.work}

╭┈ reward : ̗̀➛
┊ 🪙 Coins: ${oldCoins} ➜ ${newCoins}
┊ ⭐ Exp: ${oldExp} ➜ ${newExp}
╰─────────┈➤

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
      exp: randomRange(100, 200, true),
    },
    {
      work: "Fixed a client's buggy website",
      pay: randomRange(700, 1000, true),
      exp: randomRange(150, 200, true),
    },
    {
      work: "Wrote a short article for a blog",
      pay: randomRange(250, 400, true),
      exp: randomRange(100, 150, true),
    },
    {
      work: "Designed a logo for a small business",
      pay: randomRange(600, 950, true),
      exp: randomRange(130, 190, true),
    },
    {
      work: "Tutored a student in math for two hours",
      pay: randomRange(300, 400, true),
      exp: randomRange(110, 160, true),
    },
    {
      work: "Repaired a broken fence",
      pay: randomRange(450, 550, true),
      exp: randomRange(100, 150, true),
    },
    {
      work: "Photographed a local event",
      pay: randomRange(600, 800, true),
      exp: randomRange(120, 170, true),
    },
    {
      work: "Cleaned and detailed a car",
      pay: randomRange(200, 300, true),
      exp: randomRange(100, 130, true),
    },
    {
      work: "Set up a home Wi-Fi network",
      pay: randomRange(350, 500, true),
      exp: randomRange(110, 160, true),
    },
    {
      work: "Walked dogs for a busy family",
      pay: randomRange(200, 350, true),
      exp: randomRange(100, 130, true),
    },
    {
      work: "Painted a room in someone's house",
      pay: randomRange(800, 1000, true),
      exp: randomRange(150, 200, true),
    },
    {
      work: "Transcribed an hour-long podcast episode",
      pay: randomRange(250, 400, true),
      exp: randomRange(100, 140, true),
    },
    {
      work: "Fixed a plumbing leak under the sink",
      pay: randomRange(400, 650, true),
      exp: randomRange(120, 170, true),
    },
    {
      work: "Proofread a short business report",
      pay: randomRange(200, 275, true),
      exp: randomRange(100, 130, true),
    },
    {
      work: "Assembled furniture from flat-pack boxes",
      pay: randomRange(300, 450, true),
      exp: randomRange(100, 150, true),
    },
  ];

  return works[Math.floor(randomRange(0, works.length))];
}
