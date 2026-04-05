import TXICommand from "../../types/TXICommand";
import TXAdapterBuilder from "../adapter/TXAdapterBuilder";
import { TXIContext } from "../context/TXContext";

export default class TXCommand {
  public name: string;
  public description: string;
  public usage: string;

  public aliases?: string[];
  public cooldown?: number;

  public minimumArguments: number;
  public usedStringFlags?: string[];
  public usedBooleanFlags?: string[];

  public run: (ctx: TXIContext, adapter: TXAdapterBuilder) => Promise<void>;

  constructor(context: TXICommand) {
    this.name = context.name;
    this.description = context.description;
    this.usage = context.usage;

    this.aliases = context.aliases;
    this.cooldown = context.cooldown;

    this.minimumArguments = context.minimumArguments;
    this.usedStringFlags = context.usedStringFlags;
    this.usedBooleanFlags = context.usedBooleanFlags;

    this.run = context.run;
  }
}
