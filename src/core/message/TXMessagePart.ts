export type TXTextPart = { type: "text"; value: string };
export type TXMentionPart = {
  type: "mention";
  userId: string;
  displayName: string;
};
export type TXMessagePart = TXTextPart | TXMentionPart;
