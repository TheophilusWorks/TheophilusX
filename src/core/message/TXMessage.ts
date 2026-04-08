import { TXIContext } from "../context/TXContext.js";
import TXSentMessage from "./TXSentMessage.js";
import TXMessageOptions from "./TXMessageOptions.js";

export default class TXMessage {
  public readonly context: TXIContext;

  constructor(
    context: TXIContext,
    private replyFn: (
      message: TXMessageOptions | string,
    ) => Promise<TXSentMessage | null>,
  ) {
    this.context = context;
  }

  reply(message: TXMessageOptions | string) {
    return this.replyFn(message);
  }
}
