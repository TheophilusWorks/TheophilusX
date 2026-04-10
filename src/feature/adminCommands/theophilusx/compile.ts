import { exec } from "child_process";
import { promisify } from "util";
import TXCommand from "../../../core/command/TXCommand.js";

const execAsync = promisify(exec);

export default new TXCommand({
  name: "compile",
  description: "Recompiles TheophilusX's source",
  usage: "compile",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  execute: async ({ adapter, context }) => {
    await adapter.reply(context, "Compiling...");
    await execAsync("npx tsc");
    await adapter.reply(context, "Successfully recompiled TheophilusX");
  },
});
