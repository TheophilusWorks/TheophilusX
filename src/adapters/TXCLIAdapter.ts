import TXEventBus from "../core/TXEventBus";
import { ask, continue_prompt } from "../utils/prompt";
import TXAdapterBuilder from "./TXAdapterBuilder";
import config from "../../config.json";
import TXCommandParser from "../core/TXCommandParser";
import TXMessageHandle from "../core/TXMessageHandle";
import TXContextBuilder, { TXContext } from "../core/TXContextBuilder";
import { instance } from "../main";

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

    if (input == config.cli.exitCode) {
      process.exit(0);
    }

    if (input.startsWith(config.prefix.default)) {
      let cmd = new TXCommandParser(input).parseCommandString();
      await eventBus.dispatch(
        "command",
        cliNormalizer(input),
        cmd,
        instance.getAdapter("cli"),
      );
    } else {
      await eventBus.dispatch(
        "message",
        cliNormalizer(input),
        instance.getAdapter("cli"),
      );
    }
    await continue_prompt();
  }
}

async function cliMessageSender(ctx: TXContext) {
  console.log(ctx.content);
}

function cliNormalizer(raw: unknown) {
  let msg = raw as string;
  return new TXContextBuilder({
    platform: "cli",
    userId: "0",
    channelId: "0",
    content: msg,
    raw: msg,
    isSelf: false,
    replySent: false,
    async reply(msg: string): Promise<TXMessageHandle> {
      if (this.replySent) {
        throw new Error("Double reply not allowed");
      }

      console.log(msg);
      this.replySent = true;

      return {
        editMsg: async (newContent: string) => {
          console.log(`(edited) ${newContent}`);
        },
      };
    },
    async editMsg(msg: string) {
      console.log(`Edited message: ${msg}`);
    },
  });
}
