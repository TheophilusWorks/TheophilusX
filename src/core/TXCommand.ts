import { TXCommandArgument } from "./TXCommandArgumentBuilder";

export interface TXCommand {
  name: string;
  description: string;
  usage: string;
  availableFlags: string[];
  execute: (args: TXCommandArgument) => void;
}

export default class TXCommandBuilder {
  private txcommand;
  constructor(txcommand: TXCommand) {
    this.txcommand = txcommand;
  }

  public execute(args: TXCommandArgument) {
    this.txcommand.execute(args);
  }

  get name() {
    return this.txcommand.name;
  }
}
