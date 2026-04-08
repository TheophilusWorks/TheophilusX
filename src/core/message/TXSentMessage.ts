import { TXIContext } from "../context/TXContext.js";
import TXMessage from "./TXMessage.js";

export interface TXIWaitReplyOptions {
  timeout: number;
  filter?: (msg: TXIContext) => boolean;
};

export default class TXSentMessage {
  constructor(
    private ctx: TXIContext,
    private waitReplyFn: (
      ctx: TXIContext,
      options: TXIWaitReplyOptions,
    ) => Promise<TXMessage | null>,
  ) {}

  waitReply(options: TXIWaitReplyOptions) {
    return this.waitReplyFn(this.ctx, options);
  }
}
