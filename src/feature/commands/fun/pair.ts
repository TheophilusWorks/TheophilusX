import path from "node:path";
import TXCommand from "../../../core/command/TXCommand.js";
import { getDirname } from "../../../utils/path.js";
import { randomRange } from "../../../utils/randomRange.js";
import { TXIAuthor } from "../../../core/context/TXContext.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import { TXMessagePart } from "../../../core/message/TXMessagePart.js";
import instance from "../../../instance.js";
import TheophilusX from "../../../core/TheophilusX.js";

const __dirname = getDirname(import.meta.url);
const PAIR_IMAGE_PATH = path.resolve(
  __dirname,
  "../../../../assets/pair-cat.jpg",
);
const TSUNDERE_GIF_PATH = path.resolve(
  __dirname,
  "../../../../assets/tsundere-pout.gif",
);

export default new TXCommand({
  name: "pair",
  description: "Pairs you to someone or to a random user in the server",
  usage: "pair (user)",
  minimumArguments: 0,
  cooldown: 10_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let previousCache = new Map(instance.userCache.getAll());
    let serverUsers = (await adapter.getAllUsers(ctx)).filter(
      (u) => u.id !== ctx.author.id && u.avatarURL,
    );

    let targetUser =
      ctx.mentions[0] ||
      serverUsers[Math.floor(randomRange(0, serverUsers.length))];

    previousCache.set(`${ctx.platform}-${targetUser.id}`, {
      data: targetUser,
      expiresAt: Date.now() + TheophilusX.USER_CACHE_TTL_MS,
    });

    // NOTE: Kind of dangerous but IDGAF. This is just
    // a collection of users anyways... just refetch lol
    instance.userCache.from(previousCache);

    let matchPercent = pairUsers(ctx.author.id, targetUser.id) * 100;

    let attachments = [
      ctx.author.avatarURL,
      PAIR_IMAGE_PATH,
      targetUser.avatarURL,
    ];
    if (targetUser.isSelf) matchPercent = 100000;

    await adapter.reply(ctx, {
      parts: formatPairMessage(ctx.author, targetUser, matchPercent),
      attachments,
    });

    if (targetUser.isSelf) {
      await adapter.reply(ctx, {
        parts: [
          text(
            "T-that was just a ship okay? I-it's not like i REALLY have a crush on you, dummy! *blushes*",
          ),
        ],
        attachments: [TSUNDERE_GIF_PATH],
      });
    }
  },
});

function pairUsers(user1: string, user2: string) {
  const [first, second] = [user1, user2].sort();
  const str = `${first}:${second}`;

  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  return (hash >>> 0) / 0xffffffff;
}

function formatPairMessage(
  user1: TXIAuthor,
  user2: TXIAuthor,
  matchPercent: number,
): TXMessagePart[] {
  let footerMessages = [
    "You two could still be friends... right?",
    "We're getting somewhere",
    "What a cute couple",
    "Perfect match!",

    // lmao
    "W-wait, m-me?! *blushes* I-i'm not blushing! " +
      "It's not like I'm enjoying this! B-baka! Hmp!",
  ];

  let footerIdx = 0;

  if (matchPercent < 25) {
    footerIdx = 0;
  } else if (matchPercent < 50) {
    footerIdx = 1;
  } else if (matchPercent < 75) {
    footerIdx = 2;
  } else {
    footerIdx = 3;
  }

  // lol
  if (user2.isSelf) footerIdx = 4;

  return [
    text(`‗   ↳ ❝ [ Pair Results ] ¡! ❞
ೃ⁀➷ The cat have spoken for `),
    mention(user1.id, user1.displayName),
    text(" & "),
    mention(user2.id, user2.displayName),
    text("\n"),
    text("\n╭┈ compatibility : ̗̀➛\n"),
    text("┊ 💞 "),
    mention(user1.id, user1.displayName),
    text(" + "),
    mention(user2.id, user2.displayName),
    text("\n"),
    text(`┊ ✦ Match: ${Math.floor(matchPercent)}%\n`),
    text(`╰────────────┈➤\n`),
    text(`\n𓆩⟡𓆪 ${footerMessages[footerIdx]}`),
  ] as TXMessagePart[];
}
