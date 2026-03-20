import { EventEmitter } from "events";
import { TXIEvent } from "./TXEvent";

export default class TXEventBus extends EventEmitter {
  constructor() {
    super();
  }

  public async dispatch<K extends keyof TXIEvent>(
    event: K,
    ...args: Parameters<TXIEvent[K]>
  ): Promise<void> {
    const listeners = this.rawListeners(event) as ((...args: any[]) => any)[];
    for (const listener of listeners) {
      await listener(...args);
    }
  }

  public on<K extends keyof TXIEvent>(event: K, listener: TXIEvent[K]): this {
    return super.on(event, listener);
  }
}
