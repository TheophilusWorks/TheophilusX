import TXCommand from "../../../core/command/TXCommand.js";
import instance from "../../../instance.js";

export default new TXCommand({
  name: "reload",
  description: "Hot-reloads TheophilusX's modules",
  usage: "reload",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async ({ adapter, context, args }) => {
    await adapter.reply(context, "Reloading modules");
    await instance.reloadModules();
    await adapter.reply(context, "Modules successfully reloaded.");
  },
});
