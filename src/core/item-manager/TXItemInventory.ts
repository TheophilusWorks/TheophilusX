export interface TXIItemInventory {
  getCommands(): string[];
  addCommand(commandName: string): void;
  hasCommand(commandName: string): boolean;
}

export default class TXItemInventory implements TXIItemInventory {
  private commands: string[];
  private items: string[];

  constructor() {
    this.commands = [];
    this.items = [];
  }
  
  public static hydrateInventory(raw: { commands: string[] }): TXItemInventory {
    const inv = new TXItemInventory();
    raw.commands.forEach((cmd) => inv.addCommand(cmd));
    raw.commands.forEach((cmd) => inv.addCommand(cmd));
    return inv;
  }

  public addCommand(commandName: string): void {
    this.commands.push(commandName);
  }
  
  public addItem(itemName: string): void {
    this.items.push(itemName);
  }

  public hasCommand(commandName: string): boolean {
    return this.commands.includes(commandName);
  }

  public hasItem(itemName: string): boolean {
    return this.items.includes(itemName);
  }

  public getCommands(): string[] {
    return this.commands;
  }

  public getItems(): string[] {
    return this.items;
  }
}
