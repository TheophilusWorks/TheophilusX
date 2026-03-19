import { EventEmitter } from "events";
import TXContext from "./TXContext";
import { TXICommandContext } from "./TXCommandContext";

export type TXEvents = {
  message: (ctx: TXContext) => void;
  command: (ctx: TXContext, commandContext: TXICommandContext) => void;
  userJoin: (ctx: TXContext) => void;
};

export default class TXEventBus extends EventEmitter {
  constructor() {
    super();
  }

  // Emit typed event
  public emit<K extends keyof TXEvents>(
    event: K,
    ...args: Parameters<TXEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  // Listen for typed event
  public on<K extends keyof TXEvents>(event: K, listener: TXEvents[K]): this {
    return super.on(event, listener);
  }
}
