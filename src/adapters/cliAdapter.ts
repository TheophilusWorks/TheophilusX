import readline from "readline/promises";
import TheophilusX from "../core/TheophilusX.js";
import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder.js";
import { TXIContext, TXPlatform } from "../core/context/TXContext.js";
import instance from "../instance.js";
import TXCommandArgumentParser from "../core/command/parser/TXCommandParser.js";

export default function buildCliAdapter(bot: TheophilusX) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  const adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      // a second of delay so it wont mess
      // with the loading logs
      await new Promise((res) => setTimeout(res, 1000));
      rl.prompt();
      rl.on("line", (input) => {
        const trimmed = input.trim();
        const usedPrefix = instance.prefixes.find((p) => trimmed.startsWith(p));

        if (usedPrefix) {
          const args = new TXCommandArgumentParser(
            usedPrefix,
            trimmed,
            adapter,
            undefined,
            buildCLIContext(trimmed),
          ).parse();
          bot.emit("commandCreate", args);
        } else {
          bot.emit("messageCreate", buildCLIContext(trimmed), adapter);
        }

        rl.prompt();
      });
    })
    .setMessageSender(async (_target, message) => {
      if (typeof message === "string") {
        console.log(message);
      } else {
        let msg = `${message.message}\n\n${message.attachments?.join("\n")}`;
        console.log(msg);
      }
    })
    .setReplySender(async (_ctx, message) => {
      if (typeof message === "string") {
        console.log(message);
      } else {
        let msg = `${message.message}\n\n${message.attachments?.join("\n")}`;
        console.log(msg);
      }
    });

  return adapter;
}

function buildCLIContext(raw: string): TXIContext {
  let trimmed = raw.trim();
  return {
    platform: TXPlatform.Cli,
    content: trimmed,
    channelId: undefined,
    serverId: undefined,
    timestamp: new Date(),
    raw,
    replied: false,
    author: {
      id: "cli",
      displayName: "CLI User",
      username: "cli",
      isSelf: false,
      isAdmin: true,
    },
  };
}
