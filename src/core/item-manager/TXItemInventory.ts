interface TXIItemType {
  itemName: string;
  amount: number;
}

export interface TXIItemInventory {
  getCommands(): string[];
  addCommand(commandName: string): void;
  hasCommand(commandName: string): boolean;
}

export interface TXIInventory {
  commands: string[];
  items: TXIItemType[];
}

export default class TXItemInventory implements TXIItemInventory {
  private commands: string[];
  private items: Map<string, TXIItemType>;

  constructor() {
    this.commands = [];
    this.items = new Map();
  }

  public static hydrateInventory(raw: TXIInventory): TXItemInventory {
    const inv = new TXItemInventory();
    inv.commands = raw.commands;
    for (const item of raw.items) {
      inv.items.set(item.itemName, item);
    }
    return inv;
  }

  public addCommand(commandName: string): void {
    this.commands.push(commandName);
  }

  public addItem(itemName: string): void {
    if (!this.hasItem(itemName)) {
      this.items.set(itemName, { itemName, amount: 1 });
      return;
    }

    this.items.get(itemName)!.amount++;
  }

  public hasCommand(commandName: string): boolean {
    return this.commands.includes(commandName);
  }

  public hasItem(itemName: string): boolean {
    return this.items.has(itemName);
  }

  public getCommands(): string[] {
    return this.commands;
  }

  public getItems(): TXIItemType[] {
    return Array.from(this.items.values());
  }
}
