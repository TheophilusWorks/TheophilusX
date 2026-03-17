import { TXIContext } from "../core/TXContext";
import TXEventBus from "../core/TXEventBus";

export default class TXAdapter {
  protected eventBus: TXEventBus;

  constructor(eventBus: TXEventBus) {
    this.eventBus = eventBus;
  }

  public async connect() {
    throw new Error("connect() must be implemented by subclass");
  }

  public async sendMessage(option: TXIContext): Promise<void> {
    throw new Error("sendMessage() must be implemented by subclass");
  }

  public normalizeEvent(msg: any) {
    throw new Error("normalizeEvent() must be implemented by subclass");
  }
}
