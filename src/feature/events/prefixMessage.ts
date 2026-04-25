import TXAdapterBuilder from "../../core/adapter/TXAdapterBuilder.js";
import { TXPlatform, TXIContext } from "../../core/context/TXContext.js";
import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import instance from "../../instance.js";

const MESSAGED_GROUPS = new Map<string, number>();

export default new TXEventBuilder(
  "messageCreate",
  async (ctx: TXIContext, adapter: TXAdapterBuilder) => {
    if (ctx.author.isSelf) return;
    if (!ctx.content.includes("prefix")) return;

    let key = groupKey(ctx.platform, ctx.serverId);
    let now = Date.now();

    if ((MESSAGED_GROUPS.get(key) ?? 0) > now) return;

    await adapter.reply(
      ctx,
      `
‗   ↳ ❝ [ Prefix ] ¡! ❞
ೃ⁀➷ Here  re my prefixes:
         ◇─◇───◇─◇

╭┈ info : ̗̀➛
${instance.prefixes.map((v, i) => `┊ ${i + 1}: "${v}"`).join("\n")}
╰─────────┈➤

𓆩⟡𓆪 Type \`%help\` to see all available commands!
`.trim(),
    );

    let cd = now + 60_000; // 1 min
    MESSAGED_GROUPS.set(key, cd);
    setTimeout(() => {
      MESSAGED_GROUPS.delete(key);
    }, 60_000);
  },
);

function groupKey(platform: TXPlatform, serverId: string) {
  return `${platform}-${serverId}`;
}
