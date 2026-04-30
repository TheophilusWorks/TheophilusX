import ms from "ms";
import TXCommand from "../../../core/command/TXCommand.js";
import TheophilusX from "../../../core/TheophilusX.js";
import instance from "../../../instance.js";
import { TXPlatform } from "../../../core/context/TXContext.js";

export default new TXCommand({
  name: "info",
  description: "Shows bot information.",
  usage: "info",
  minimumArguments: 0,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter }) => {
    let prefixes = instance.prefixes.join(" · ");

    let info = `
ᵎᵎ  theophilusx   𔔁

  𖤛 ver       ${TheophilusX.version}
  ⎔ stack     Node.js · TypeScript
  ⌗ database  MongoDB
  ⌘ prefixes  ${prefixes}

  01 ⋆ platforms  ${instance.getUsedPlatforms().join(" | ")}
  02 ⋆ commands   ${instance.commandCount} cmds
  03 ⋆ events     ${instance.eventCount} events
  04 ⋆ uptime     ${ms(process.uptime() * 1000)}
  05 ⋆ memory     ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB

  ⦇ owner ─┄  Theophilus
  ⦇ dev   ─┄  Theophilus
`;

    if (ctx.platform == TXPlatform.FacebookMessenger) {
      info += `\n\t・・・・・・・・・\n  𔔁 account owned by Aeon`;
    }
    await adapter.reply(ctx, info.trim());
  },
});
