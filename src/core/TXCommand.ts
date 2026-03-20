import { TXCommandArgument } from "./TXCommandArgumentBuilder";

export interface TXCommand {
  name: string;
  description: string;
  usage: string;
  availableFlags: string[];
  minimumRequiredArguments: number;
  cooldown: number,
  execute: (args: TXCommandArgument) => Promise<void>;
}

export default class TXCommandBuilder {
  private txcommand;
  constructor(txcommand: TXCommand) {
    this.txcommand = txcommand;
  }

  public async execute(args: TXCommandArgument) {
    await this.txcommand.execute(args);
  }

  get name() {
    return this.txcommand.name;
  }
  get description() {
    return this.txcommand.description;
  }
  get usage() {
    return this.txcommand.usage;
  }
  get availableFlags() {
    return this.txcommand.availableFlags;
  }
  get minimumRequiredArguments() {
    return this.txcommand.minimumRequiredArguments;
  }
  get cooldown() {
    return this.txcommand.cooldown;
  }
}
