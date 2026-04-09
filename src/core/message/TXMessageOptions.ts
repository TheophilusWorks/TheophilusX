import { TXMessagePart } from "./TXMessagePart.js";

export default interface TXMessageOptions {
  parts?: TXMessagePart[];
  attachments?: string[];
}
