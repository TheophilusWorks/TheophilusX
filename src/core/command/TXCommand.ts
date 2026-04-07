import TXICommand from "../../types/TXICommand.js";
import TXICommandArgument from "../../types/TXICommandArgument.js";

export default class TXCommand {
  public name: string;
  public description: string;
  public usage: string;
  public cooldown: number;

  public aliases?: string[];
  public category?: string; // injected by the main loader

  public minimumArguments: number;
  public minimumGroupedArguments: number;
  public usedStringFlags?: string[];
  public usedBooleanFlags?: string[];

  public execute: (ctx: TXICommandArgument) => Promise<void>;

  constructor(context: TXICommand) {
    this.name = context.name;
    this.description = context.description;
    this.usage = context.usage;

    this.aliases = context.aliases;
    this.cooldown = context.cooldown;

    this.minimumArguments = context.minimumArguments;
    this.minimumGroupedArguments = context.minimumGroupedArguments;
    this.usedStringFlags = context.usedStringFlags;
    this.usedBooleanFlags = context.usedBooleanFlags;

    this.execute = context.execute;
  }
}
