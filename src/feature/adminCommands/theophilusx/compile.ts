import TXCommand from "../../../core/command/TXCommand.js";
import instance from "../../../instance.js";

export default new TXCommand({
  name: "compile",
  description: "Recompiles TheophilusX's source",
  usage: "update",
  minimumArguments: 0,
  aliases: ["comp"],
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async ({ adapter, context }) => {
    await adapter.reply(context, "Compiling...");
    await instance.compile();
    await adapter.reply(context, "Successfully recompiled TheophilusX");
  },
});
