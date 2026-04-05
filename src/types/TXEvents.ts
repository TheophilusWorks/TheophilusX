import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder";
import { TXIContext } from "../core/context/TXContext";

export default interface TXEvents {
  messageCreate: (ctx: TXIContext, adapter: TXAdapterBuilder) => Promise<void>;
  // commandCreate: (command: any) => Promise<void>;
}
