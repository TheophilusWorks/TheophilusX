import { TXMessagePart } from "./TXMessagePart.js";

export const text = (value: string): TXMessagePart => ({ type: "text", value });
export const divider = (): TXMessagePart => ({
  type: "text",
  value: "◇─◇───◇─◇",
});
export const mention = (
  userId: string,
  displayName: string,
): TXMessagePart => ({ type: "mention", userId, displayName });
