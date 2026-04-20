import TXEvents from "../../types/TXEvents.js";
import { TXNext } from "../event/TXEventBuilder.js";

export default class TXMiddleware<K extends keyof TXEvents> {
  public callback = async (..._args: [...Parameters<TXEvents[K]>, TXNext]): Promise<void> => {
    throw new Error("Callback not implemented");
  }
}
