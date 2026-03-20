import { TXAdapter } from "../adapters/TXAdapterBuilder";
import { TXICommandContext } from "./TXCommandContext";
import TXContextBuilder from "./TXContextBuilder";

export type TXIEvent = {
  message: (ctx: TXContextBuilder, adapter: TXAdapter) => void;
  command: (ctx: TXContextBuilder, commandContext: TXICommandContext, adapter: TXAdapter) => void;
  userJoin: (ctx: TXContextBuilder, adapter: TXAdapter) => void;
};

export default class TXEvent<K extends keyof TXIEvent> {
  private event: K
  private callable: TXIEvent[K]

  constructor(event: K, callable: TXIEvent[K]){
    this.event = event
    this.callable = callable
  }

  public getCallable() {
    return this.callable
  }
  public getEvent() {
    return this.event
  }
}
