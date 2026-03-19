import TXContext, { TXIContext } from "../core/TXContext";
import TXEventBus from "../core/TXEventBus";
import { ask, continue_prompt } from "../utils/prompt";
import TXAdapterBuilder from "./TXAdapterBuilder";
import config from "../../config.json";
import TXCommandParser from "../core/TXCommandParser";

export default function createCLIAdapter(eventBus: TXEventBus) {
  return new TXAdapterBuilder()
    .setEventBus(eventBus)
    .setMessageSender(cliMessageSender)
    .setNormalizer(cliNormalizer)
    .setConnector(() => cliConnector(eventBus))
    .build();
}

async function cliConnector(eventBus: TXEventBus) {
  while (true) {
    console.clear();
    let input = await ask("Input > ");

    if (input == config.cliExit) {
      process.exit(0);
    }

    if (input.startsWith(config.prefix.default)) {
      let cmd = new TXCommandParser(input).parseCommandString();
      eventBus.emit("command", cliNormalizer(input), cmd);
    } else {
      eventBus.emit("message", cliNormalizer(input));
    }
    await continue_prompt();
  }
}

async function cliMessageSender(ctx: TXIContext) {
  console.log(ctx.content);
}

function cliNormalizer(raw: unknown) {
  let msg = raw as string;
  return new TXContext({
    platform: "cli",
    userId: "0",
    channelId: "0",
    content: msg,
    raw: msg,
    isSelf: false,
    async reply(message: string) {
      console.log(message);
    },
  });
}
