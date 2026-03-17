import TXEventBus from "../core/TXEventBus";
import { ask } from "../utils/prompt";
import TXAdapter from "./TXAdapter";
import config from "../../config.json";
import TXContext, { TXIContext } from "../core/TXContext";

export default class TXCLIAdapter extends TXAdapter {
  private client;

  constructor(
    eventBus: TXEventBus,
    client: { send: (...data: any[]) => void },
  ) {
    super(eventBus);
    this.client = client;
  }

  public async connect() {
    while (true) {
      console.log(`Enter a command: ('${config.cliExit}') to exit`);
      let msg = await ask(">> ");

      if (msg == config.cliExit) {
        console.log("Exiting...");
        process.exit(0);
      }

      let context = this.normalizeEvent(msg);
      this.eventBus.emit("message", context);
    }
  }

  public async sendMessage({ content }: TXIContext): Promise<void> {
    this.client.send(content);
  }

  public getClient() {
    throw new Error("getClient() must be implemented by subclass");
  }

  public normalizeEvent(msg: string) {
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
}
