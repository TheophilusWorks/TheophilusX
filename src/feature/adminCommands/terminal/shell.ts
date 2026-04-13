import { exec } from "node:child_process";
import { promisify } from "node:util";
import TXCommand from "../../../core/command/TXCommand.js";

const execAsync = promisify(exec);

export default new TXCommand({
  name: "shell",
  description: "Runs a raw shell command",
  usage: "shell <command>",
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async ({ adapter, context, args }) => {
    if (args.length > 0) {
      const command = args.join(" ");
      let output = await runShell(command);
      await adapter.reply(context, output);
      return;
    }

    while (true) {
      let res = await adapter.reply(
        context,
        `Please reply to this message with your shell command`,
      );
      let cmd = await res.waitReply({
        timeout: 120_000,
        filter: (msg) => msg.author.id == context.author.id,
      });

      if (cmd?.context.content == "==exit==") {
        adapter.reply(context, "Exited shell mode...");
        return;
      }
      let output = await runShell(cmd?.context.content || "");
      output += `\n\n\nType \`==exit==\` to exit shell mode`;
      await adapter.reply(context, output);
    }
  },
});

async function runShell(cmd: string) {
  const { stdout, stderr } = await execAsync(cmd);

  let output = "";
  if (stdout) output += stdout;
  if (stderr) output += stderr;

  if (output.length > 1250)
    output = output.slice(0, 1250) + "\n…output truncated…";

  return output;
}
