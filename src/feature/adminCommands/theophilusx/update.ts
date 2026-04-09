import { exec } from "node:child_process";
import { promisify } from "node:util";
import TXCommand from "../../../core/command/TXCommand.js";

const execAsync = promisify(exec);

export default new TXCommand({
  name: "update",
  description: "Fetches latest source from repo, compiles, and restarts",
  usage: "update",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  execute: async ({ adapter, context }) => {
    try {
      const { stdout: pullStdout } = await execAsync("git pull");

      // check if anything was updated
      const match = pullStdout.match(/Updating\s+([0-9a-f]+)\.\.([0-9a-f]+)/);

      if (!match) {
        await adapter.reply(context, "Already up to date, no commits pulled.");
        return;
      }

      const [_, oldHash, newHash] = match;

      const { stdout: countStdout } = await execAsync(
        `git rev-list --count ${oldHash}..${newHash}`,
      );

      const commitCount = parseInt(countStdout.trim(), 10);

      await adapter.reply(
        context,
        `Pulled ${commitCount} commit${commitCount === 1 ? "" : "s"} successfully!`,
      );
    } catch (err) {
      console.error("[update command] error:", err);
      await adapter.reply(
        context,
        `Failed to update: ${(err as Error).message}`,
      );
    }
  },
});
