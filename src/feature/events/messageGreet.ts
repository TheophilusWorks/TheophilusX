import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import { mention, text } from "../../core/message/TXMessageBuilder.js";
import { capitalize } from "../../utils/capitalize.js";

const GREET_MESSAGES = [
  "hello",
  "hi",
  "yo",
  "sup",
  "hola",
  "halo",
  "ellow",
  "hellow",
];

export default new TXEventBuilder("messageCreate", async (ctx, adapter) => {
  if (ctx.author.isSelf) return;

  for (const word of ctx.content.toLowerCase().split(/\s+/)) {
    let greet = GREET_MESSAGES.find((val) => val.startsWith(word));
    if (!greet) continue;

    adapter.reply(ctx, {
      parts: [
        text(`${capitalize(greet)}, `),
        mention(ctx.author.id, ctx.author.displayName),
      ],
    });
    break;
  }
});
