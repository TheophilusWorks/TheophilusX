import TXCommand from "../../../core/command/TXCommand.js";
import instance from "../../../instance.js";
import TXICommandArgument from "../../../types/TXICommandArgument.js";

export default new TXCommand({
  name: "update",
  description: "Fetches latest source from repo, compiles, and restarts",
  usage: "update",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async (ctx, cmdQuery) => {
    const { adapter } = cmdQuery;

    // TODO: add a way to not hardcode this.
    const time = new Date(Date.now() + 5 * 60_000).toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });

    let msg = `
⚙️ TheophilusX is currently updating.
Commands and events will be unavailable
until approximately ${time}.

◇─◇───◇─◇

Please wait while the bot pulls the
latest changes and restarts.
`.trim();

    let announcementQuery: TXICommandArgument = {
      ...cmdQuery,
      command: "announce",
      stringFlags: {
        tag: "update",
      },
      args: msg.split("\n").map((line) => (line += "\n")),
    };

    instance.executeAdminCommand(ctx, announcementQuery);
    await adapter.reply(ctx, "Successfully announced an update...");
    await instance.updateTheophilusX(adapter, ctx);
  },
});
