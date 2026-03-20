export default interface TXMessageHandle {
  editMsg: (newContent: string) => Promise<void>;
}
