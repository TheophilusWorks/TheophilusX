import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";
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
    await adapter.reply(context, "Pulling latest changes...");

    const { stdout: beforeHash } = await execAsync("git rev-parse HEAD");
    await execAsync("git pull");
    const { stdout: afterHash } = await execAsync("git rev-parse HEAD");

    const before = beforeHash.trim();
    const after = afterHash.trim();

    if (before === after) {
      await adapter.reply(context, "Already up to date. No new commits.");
      return;
    }

    const { stdout: logOutput } = await execAsync(
      `git log ${before}..${after} --oneline`,
    );

    const commits = logOutput.trim().split("\n").filter(Boolean);
    const commitLines = commits.map((line) => `• ${line}`).join("\n");

    await adapter.reply(
      context,
      `Pulled ${commits.length} commit${commits.length === 1 ? "" : "s"}:\n${commitLines}`,
    );

    await adapter.reply(context, "Compiling...");
    await execAsync("npx tsc");

    await adapter.reply(context, "Restarting...");

    spawn(process.execPath, process.argv.slice(1), {
      detached: true,
      stdio: "inherit",
    }).unref();

    process.exit(0);
  },
});
