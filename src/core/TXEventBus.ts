import { EventEmitter } from "events";
import { TXIEvent } from "./TXEvent";

export default class TXEventBus extends EventEmitter {
  constructor() {
    super();
  }

  // Emit typed event
  public emit<K extends keyof TXIEvent>(
    event: K,
    ...args: Parameters<TXIEvent[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  // Listen for typed event
  public on<K extends keyof TXIEvent>(event: K, listener: TXIEvent[K]): this {
    return super.on(event, listener);
  }
}
