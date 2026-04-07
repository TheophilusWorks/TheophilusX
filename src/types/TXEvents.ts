import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder.js";
import { TXIContext } from "../core/context/TXContext.js";
import TXICommandArgument from "./TXICommandArgument.js";

export default interface TXEvents {
  messageCreate: (ctx: TXIContext, adapter: TXAdapterBuilder) => Promise<void>;
  commandCreate: (command: TXICommandArgument) => Promise<void>;
}
