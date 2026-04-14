import TXEvents from "../../types/TXEvents.js";
import { TXPlatform } from "../context/TXContext.js";

export interface TXEventOptions {
  blacklistedPlatforms: TXPlatform[];
}

export default class TXEventBuilder<K extends keyof TXEvents> {
  public event: K;
  public callback: TXEvents[K];
  public options?: TXEventOptions;

  constructor(event: K, callback: TXEvents[K], options?: TXEventOptions) {
    this.event = event;
    this.callback = callback;
    this.options = options;
  }
}
