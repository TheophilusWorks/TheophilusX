import TXCommand from "../../../core/command/TXCommand.js";
import Users from "../../../core/database/model/Users.js";
import TXAdapterBuilder from "../../../core/adapter/TXAdapterBuilder.js";

export default new TXCommand({
  name: "top",
  description: "View the top users in the economy",
  usage: "top",
  minimumArguments: 0,
  cooldown: 20_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    const topUsers = await Users.aggregate([
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

    const formatted = await formatTopUsers(adapter, topUsers);
    await adapter.reply(ctx, formatted);
  },
});

async function formatTopUsers(
  adapter: TXAdapterBuilder,
  rawUsers: Record<string, any>[],
): Promise<string> {
  const users = await Promise.all(
    rawUsers.map((u) => adapter.resolveUser(u.userId)),
  );

  const now = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

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
    `𓆩⟡𓆪 as of ${now}`,
  ].join("\n");
}
