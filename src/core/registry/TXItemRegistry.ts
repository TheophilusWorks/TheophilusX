import TXCommand from "../command/TXCommand.js";
import { TXIItem } from "../item-manager/TXIItem.js";
import TXItemBuilder from "../item-manager/TXItemBuilder.js";
import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";
import fs from "fs/promises";
import path from "path";

export default class TXItemManager {
  private commands: Map<string, TXCommand> = new Map();
  private items: Map<string, TXItemBuilder> = new Map();
  private logger: TXLogger;
  private loadedItems = 0;
  private loadedCommands = 0;

  private itemsPath: string;

  constructor(itemsPath: string, logger: TXLogger) {
    this.logger = logger;
    this.itemsPath = itemsPath;
  }

  public getCommand(name: string): TXCommand | undefined {
    return this.commands.get(name);
  }

  public getItem(name: string): TXIItem | undefined {
    return this.items.get(name)?.txitem;
  }

  public getAllSellableCommands(): TXCommand[] {
    return Array.from(this.commands.values()).filter((cmd) => cmd.shopInfo);
  }

  public getAllSellableItems(): TXIItem[] {
    return Array.from(this.items.values()).map((builder) => builder.txitem);
  }

  public async load(commands: Map<string, TXCommand>) {
    await this.loadItems();
    this.logger.log("Loading item commands...");

    for (const [, command] of commands) {
      if (!command.shopInfo) continue;
      this.commands.set(command.name, command);
      this.logger.log(`Loaded item command: '${command.name}'`);
      this.loadedCommands++;
    }

    this.logger.log(
      `Finished loading item commands. Total: ${this.loadedCommands}`,
    );
  }

  public async reloadModules() {}

  private async loadItems() {
    const itemsFile = await fs.readFile(this.itemsPath, "utf-8")
    const itemsArray = JSON.parse(itemsFile);

    for (const item of itemsArray) {
      this.items.set(item.name, new TXItemBuilder(item));
      this.logger.log(`Loaded item: '${item.name}'`);
      this.loadedItems++;
    }

    this.logger.log(`Finished loading items. Total: ${this.loadedItems}`);
  }

  public toSummaryNode(): TXLoggerNode {
    return {
      label: "Sellables",
      children: [
        {
          label: `Items: ${this.loadedItems}`,
          children: Array.from(this.items.values(), (item) => ({
            label: `${item.txitem.name}`,
            children: [],
          })),
        },
        {
          label: `Item Commands: ${this.loadedCommands}`,
          children: Array.from(this.commands.values())
            .filter((cmd) => cmd.shopInfo)
            .map((cmd) => ({
              label: `${cmd.name}`,
              children: [],
            })),
        },
      ],
    };
  }
}
