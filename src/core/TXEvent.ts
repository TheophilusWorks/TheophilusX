import { TXICommandContext } from "./TXCommandContext";
import TXContext from "./TXContext";

export type TXIEvent = {
  message: (ctx: TXContext) => void;
  command: (ctx: TXContext, commandContext: TXICommandContext) => void;
  userJoin: (ctx: TXContext) => void;
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
