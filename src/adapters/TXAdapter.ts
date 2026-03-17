import TXEventBus from "../core/TXEventBus";
import { TXSendMessageOptions } from "./types";

export default class TXAdapter {
  protected eventBus: TXEventBus;

  constructor(eventBus: TXEventBus) {
    this.eventBus = eventBus;
  }

  public async connect() {
    throw new Error("connect() must be implemented by subclass");
  }

  public async sendMessage(option: TXSendMessageOptions): Promise<void> {
    throw new Error("sendMessage() must be implemented by subclass");
  }

  public getClient() {
    throw new Error("getClient() must be implemented by subclass");
  }

  public normalizeEvent(msg: any) {
    throw new Error("normalizeEvent() must be implemented by subclass");
  }
}
