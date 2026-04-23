import TXCommand from "../../../core/command/TXCommand.js";
import Users from "../../../core/database/model/Users.js";
import TXAdapterBuilder from "../../../core/adapter/TXAdapterBuilder.js";

const PH_TIMEZONE = "Asia/Manila";

let CACHED_TOP_USERS: Record<string, any>[] = [];
let CACHE_DATE_KEY = "";

export default new TXCommand({
  name: "top",
  description: "View the top users in the economy",
  usage: "top",
  minimumArguments: 0,
  cooldown: 10_000, // 5s
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    if (isCacheStale()) {
      CACHED_TOP_USERS = await Users.aggregate([
        { $match: { platform: ctx.platform } },
        {
          $addFields: {
            totalBalance: {
              $add: [
                { $ifNull: ["$economy.coins", 0] },
                { $ifNull: ["$economy.bankBalance", 0] },
              ],
            },
          },
        },
        { $sort: { totalBalance: -1 } },
        { $limit: 10 },
      ]);

      CACHE_DATE_KEY = getPHDateKey();
    }

    const topUsers = await formatTopUsers(adapter, CACHED_TOP_USERS);
    await adapter.reply(ctx, topUsers);
  },
});

async function formatTopUsers(
  adapter: TXAdapterBuilder,
  rawUsers: Record<string, any>[],
): Promise<string> {
  const users = await Promise.all(
    rawUsers.map((u) => adapter.resolveUser(u.userId)),
  );

  return [
    `   ↳ ❝ [ Top Users ] ¡! ❞`,
    `⁀➷ Here are the Top 10 users in the economy:`,
    ``,
    `╭┈ balance : ̗̀➛`,
    ...users.flatMap((v, i) => {
      if (!v) return [];
      const coins = rawUsers[i].economy?.coins ?? 0;
      const bank = rawUsers[i].economy?.bankBalance ?? 0;
      return [`┊ ${i + 1}. ${v.displayName}`, `┊    🪙 ${coins}  🏦 ${bank}`];
    }),
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 Refreshes every 12:00 AM (PH Time)`,
  ].join("\n");
}

function getPHDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // returns "YYYY-MM-DD" in PH time
}

function isCacheStale(): boolean {
  return getPHDateKey() !== CACHE_DATE_KEY;
}
