import { TXPlatform } from "../core/context/TXContext.js";
import TXICommandArgument from "./TXICommandArgument.js";

export default interface TXICommand {
  name: string;
  description: string;
  usage: string;

  aliases?: string[];
  blacklistedPlatforms?: TXPlatform[];
  cooldown: number;

  minimumArguments: number;
  minimumMentions: number;
  minimumGroupedArguments: number;
  usedStringFlags?: string[];
  usedBooleanFlags?: string[];

  execute: (args: TXICommandArgument) => Promise<void>;
}
