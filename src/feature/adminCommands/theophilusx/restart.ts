import TXCommand from "../../../core/command/TXCommand.js";
import instance from "../../../instance.js";
import TXICommandArgument from "../../../types/TXICommandArgument.js";

export default new TXCommand({
  name: "restart",
  description: "Restarts the server",
  usage: "restart",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,

  execute: async (ctx, cmdQuery) => {
    const { adapter } = cmdQuery;

    const delayMs = 5 * 60 * 1000; // 5 minutes

    const time = new Date(Date.now() + delayMs).toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });

    const msg = `
⚙️ TheophilusX scheduled maintenance initiated.

⏳ Restart in: 5 minutes
🕒 Estimated back online: ${time}

━━━━━━━━━━━━━━━━━━

During this time:
• Commands may stop responding
• Events may be temporarily paused

We’ll be back shortly with the latest updates.
`.trim();

    const announcementQuery: TXICommandArgument = {
      ...cmdQuery,
      command: "announce",
      stringFlags: {
        tag: "update",
      },
      args: msg.split("\n"),
    };

    instance.isMigrating(true);
    await instance.executeAdminCommand(ctx, announcementQuery);

    await adapter.reply(ctx, "Restart scheduled in 5 minutes.");

    setTimeout(() => {
      restartProcess();
    }, delayMs);
  },
});

export function restartProcess() {
  const { spawn } = require("node:child_process");

  const args = process.argv.slice(1);

  const child = spawn(process.argv[0], args, {
    stdio: "inherit",
    detached: true,
  });

  child.unref();
  process.exit(0);
}
