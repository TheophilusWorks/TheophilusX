import TXCommand from "../../../core/command/TXCommand.js";
import instance from "../../../instance.js";

export default new TXCommand({
  name: "update",
  description: "Fetches latest source from repo, compiles, and restarts",
  usage: "update",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  execute: async ({ adapter, context }) => {
    // TODO: Use a better announce msg lol
    await adapter.announce(context, "TheophilusX is currently updating...");
    await adapter.reply(context, "Successfully announced an update...");
    await instance.updateTheophilusX(adapter, context);
  },
});
