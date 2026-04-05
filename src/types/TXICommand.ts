import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder";
import { TXIContext } from "../core/context/TXContext";

export default interface TXICommand {
  name: string;
  description: string;
  usage: string;

  aliases?: string[];
  cooldown?: number;

  minimumArguments: number;
  usedStringFlags?: string[];
  usedBooleanFlags?: string[];

  run: (ctx: TXIContext, adapter: TXAdapterBuilder) => Promise<void>;
}

