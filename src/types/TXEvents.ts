import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder";
import { TXIContext } from "../core/context/TXContext";
import TXICommandArgument from "./TXICommandArgument";

export default interface TXEvents {
  messageCreate: (ctx: TXIContext, adapter: TXAdapterBuilder) => Promise<void>;
  commandCreate: (command: TXICommandArgument, adapter: TXAdapterBuilder, ctx: TXIContext) => Promise<void>;
}
