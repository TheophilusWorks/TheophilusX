import TXEvents from "../../types/TXEvents.js";
import { TXPlatform } from "../context/TXContext.js";

export interface TXEventOptions {
  blacklistedPlatforms: TXPlatform[];
}

export type TXMiddleware<K extends keyof TXEvents> = (
  args: Parameters<TXEvents[K]>,
  next: () => void,
) => void | Promise<void>;

export default class TXEventBuilder<K extends keyof TXEvents> {
  public event: K;
  public callback: TXEvents[K];
  public options?: TXEventOptions;
  private middlewares: TXMiddleware<K>[] = [];

  constructor(event: K, ...handlers: [...TXMiddleware<K>[], TXEvents[K]]);
  constructor(
    event: K,
    ...handlers:
      | [...TXMiddleware<K>[], TXEvents[K]]
      | [TXEventOptions, ...TXMiddleware<K>[], TXEvents[K]]
  );
  constructor(event: K, ...args: any[]) {
    this.event = event;

    // Check if first arg is options
    if (
      args[0] &&
      typeof args[0] === "object" &&
      "blacklistedPlatforms" in args[0]
    ) {
      this.options = args.shift();
    }

    this.callback = args.pop();
    this.middlewares = args;
  }

  public async execute(...args: Parameters<TXEvents[K]>): Promise<void> {
    let index = 0;
    const stack = this.middlewares;

    const next = async (): Promise<void> => {
      if (index < stack.length) {
        const middleware = stack[index++];
        await middleware(args, next);
      } else {
        (this.callback as Function)(...args);
      }
    };

    await next();
  }
}
