import TXCommand from "./TXCommand";

export default interface TXCommandCategory {
  category: string;
  commands: Map<string, TXCommand>;
}
