export interface TXIItemInventory {
  getCommands(): string[];
  addCommand(commandName: string): void;
  hasCommand(commandName: string): boolean;
}

export default class TXItemInventory implements TXIItemInventory {
  private commands: string[];

  constructor() {
    this.commands = [];
  }

  public addCommand(commandName: string): void {
    this.commands.push(commandName);
  }

  public hasCommand(commandName: string): boolean {
    return this.commands.includes(commandName);
  }

  public getCommands(): string[] {
    return this.commands;
  }
}

export function hydrateInventory(raw: { commands: string[] }): TXItemInventory {
  const inv = new TXItemInventory();
  raw.commands.forEach((cmd) => inv.addCommand(cmd));
  return inv;
}
