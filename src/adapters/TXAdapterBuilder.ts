import TXContext, { TXIContext } from "../core/TXContext";
import TXEventBus from "../core/TXEventBus";

export type TXAdapterSendMessageFn = (ctx: TXIContext) => Promise<void>;
export type TXAdapterNormalizeFn = (raw: unknown) => TXContext;
export type TXAdapterConnectFn = () => Promise<void> | void;

interface TXAdapter {
  eventBus: TXEventBus | null;
  connect: TXAdapterConnectFn;
  sendMessage: TXAdapterSendMessageFn;
  normalizeEvent: TXAdapterNormalizeFn;
}

export default class TXAdapterBuilder {
  private adapter: TXAdapter;

  constructor() {
    this.adapter = {
      eventBus: null,
      connect: () => {
        throw new Error("connect() not set");
      },
      sendMessage: async () => {
        throw new Error("sendMessage() not set");
      },
      normalizeEvent: () => {
        throw new Error("normalizeEvent() not set");
      },
    };
  }

  public setEventBus(eventBus: TXEventBus) {
    this.adapter.eventBus = eventBus;
    return this;
  }

  public setMessageSender(fn: TXAdapterSendMessageFn) {
    this.adapter.sendMessage = fn;
    return this;
  }

  public setNormalizer(fn: TXAdapterNormalizeFn) {
    this.adapter.normalizeEvent = fn;
    return this;
  }

  public setConnector(fn: TXAdapterConnectFn) {
    this.adapter.connect = fn;
    return this;
  }

  public build(): TXAdapter {
    return this.adapter;
  }
}
