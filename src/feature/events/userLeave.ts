import TXAdapterBuilder from "../../core/adapter/TXAdapterBuilder.js";
import { TXIContext } from "../../core/context/TXContext.js";
import TXEventBuilder from "../../core/event/TXEventBuilder.js";

export default new TXEventBuilder(
  "userLeave",
  async (ctx: TXIContext, adapter: TXAdapterBuilder) => {
    if (ctx.author.isSelf) return;

    const msg = `
‗   ↳ ❝ [ Goodbye! ] ¡! ❞
ೃ⁀➷ A member has left the chat~
         ◇─◇───◇─◇

╭┈ farewell : ̗̀➛
┊ 𓆩⟡𓆪 ${ctx.author.displayName}
┊ has left the building...
┊ We'll miss you ♡
╰─────────┈➤

𓆩⟡𓆪 Farewell, until we meet again~
`;

    await adapter.sendMessage(ctx.channelId, msg.trim());
  },
);
