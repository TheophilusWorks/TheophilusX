import { EventEmitter } from "events";
import TXContext from "./TXContext";

// You can type the events your bot will emit
export type TXEvents = {
  message: (ctx: TXContext) => void;
  command: (ctx: TXContext, command: string, args: string[]) => void;
  userJoin: (ctx: TXContext) => void;
  // add more events as needed
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
  public on<K extends keyof TXEvents>(
    event: K,
    listener: TXEvents[K]
  ): this {
    return super.on(event, listener);
  }
}
