import readline from "readline/promises";
import TheophilusX from "../core/TheophilusX";
import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder";

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
        if (!trimmed) return rl.prompt();

        bot.emit(
          "messageCreate",
          {
            platform: "CLI",
            content: trimmed,
            channelId: undefined,
            serverId: undefined,
            timestamp: new Date(),
            raw: input,
            author: {
              id: "cli",
              displayName: "CLI User",
              username: "cli",
              isSelf: false,
              isAdmin: true,
            },
          },
          adapter,
        );

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
