import readline from "readline/promises";
import TheophilusX from "../core/TheophilusX";
import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder";
import { TXIContext } from "../core/context/TXContext";
import { instance } from "../main";
import TXCommandArgumentParser from "../core/command/parser/TXCommandParser";

export default function buildCliAdapter(bot: TheophilusX) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  const adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      rl.prompt();
      rl.on("line", (input) => {
        const trimmed = input.trim();
        const usedPrefix = instance.prefixes.find((p) => trimmed.startsWith(p));

        if (usedPrefix) {
          const args = new TXCommandArgumentParser(
            usedPrefix,
            trimmed,
            adapter,
          ).parse();
          bot.emit("commandCreate", args);
        } else {
          bot.emit("messageCreate", buildCLIContext(trimmed), adapter);
        }

        rl.prompt();
      });
    })
    .setMessageSender(async (_target, message) => {
      console.log(message);
    })
    .setReplySender(async (message) => {
      console.log(message);
    });

  return adapter;
}

function buildCLIContext(raw: string): TXIContext {
  let trimmed = raw.trim();
  return {
    platform: "CLI",
    content: trimmed,
    channelId: undefined,
    serverId: undefined,
    timestamp: new Date(),
    raw,
    author: {
      id: "cli",
      displayName: "CLI User",
      username: "cli",
      isSelf: false,
      isAdmin: true,
    },
  };
}
