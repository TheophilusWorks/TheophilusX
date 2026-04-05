import TXEvents from "../../types/TXEvents";

export default class TXEventBuilder<K extends keyof TXEvents> {
  public event: K;
  public callback: TXEvents[K];

  constructor(event: K, callback: TXEvents[K]) {
    this.event = event;
    this.callback = callback;
  }
}
