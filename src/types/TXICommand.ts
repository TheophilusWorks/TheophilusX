import TXICommandArgument from "./TXICommandArgument.js";

export default interface TXICommand {
  name: string;
  description: string;
  usage: string;

  aliases?: string[];
  cooldown: number;

  minimumArguments: number;
  minimumGroupedArguments: number;
  usedStringFlags?: string[];
  usedBooleanFlags?: string[];

  execute: (args: TXICommandArgument) => Promise<void>;
}
