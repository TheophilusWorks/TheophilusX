import ms from "ms";
import TXCommand from "../../../core/command/TXCommand.js";
import TheophilusX from "../../../core/TheophilusX.js";
import instance from "../../../instance.js";

export default new TXCommand({
  name: "info",
  description: "Shows bot information.",
  usage: "info",
  minimumArguments: 0,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
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
    await adapter.reply(context, info.trim());
  },
});
