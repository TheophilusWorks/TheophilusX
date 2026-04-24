import TXAdapterBuilder from "../../core/adapter/TXAdapterBuilder.js";
import { TXIContext } from "../../core/context/TXContext.js";
import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import instance from "../../instance.js";

export default new TXEventBuilder(
  "userJoin",
  async (ctx: TXIContext, adapter: TXAdapterBuilder) => {
    let msg = `
‗   ↳ ❝ [ Welcome! ] ¡! ❞
ೃ⁀➷ A new member has arrived~
         ◇─◇───◇─◇

╭┈ welcome : ̗̀➛
┊ 𓆩⟡𓆪 ${ctx.author.displayName}
┊ We're glad to have you here!
┊ Feel free to look around ♡
╰─────────┈➤

𓆩⟡𓆪 Say hi to our newest member!
`;

    if (ctx.author.isSelf) {
      msg = `
‗   ↳ ❝ [ Hello! ] ¡! ❞
ೃ⁀➷ I just joined the chat~
         ◇─◇───◇─◇

╭┈ info : ̗̀➛
┊ I'm TheophilusX, your new assistant!
┊ Here are my prefixes:
┊
${instance.prefixes.map((v, i) => `┊ ${i + 1}: "${v}"`).join("\n")}
╰─────────┈➤

𓆩⟡𓆪 Type \`%help\` to see all available commands!
`;
    }

    await adapter.sendMessage(ctx.channelId, msg.trim());
  },
);
