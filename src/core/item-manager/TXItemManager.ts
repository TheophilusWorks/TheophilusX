import TXCommand from "../command/TXCommand.js";
import TXDatabaseManager from "../database/TXDatabaseManager.js";
import TXItemBuilder from "./TXItemBuilder.js";
import { TXIItem } from "./TXIItem.js";
import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";
import fs from "fs";
import path from "path";

export default class TXItemManager {
  private commands: Map<string, TXCommand> = new Map();
  private items: Map<string, TXItemBuilder> = new Map();
  private database: TXDatabaseManager;
  private logger: TXLogger;
  private loadedItems = 0;
  private loadedCommands = 0;

  private itemsPath: string;

  constructor(
    itemsPath: string,
    database: TXDatabaseManager,
    logger: TXLogger,
  ) {
    this.database = database;
    this.logger = logger;
    this.itemsPath = itemsPath;
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
      this.logger.log(`Loaded item command: '${command.name}'`);
      this.loadedCommands++;
    }

    this.logger.log(
      `Finished loading item commands. Total: ${this.loadedCommands}`,
    );
  }

  public async reloadModules() {}

  private async loadItems() {
    const itemFiles = fs
      .readdirSync(this.itemsPath)
      .filter((file) => file.endsWith(".json"));

    for (const file of itemFiles) {
      const filePath = path.join(this.itemsPath, file);
      const rawData: TXIItem = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      this.items.set(rawData.name, new TXItemBuilder(rawData));
      this.logger.log(`Loaded item: '${rawData.name}'`);
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
            label: `${item.txitem.name} - ${item.txitem.description}`,
            children: [],
          })),
        },
        {
          label: `Item Commands: ${this.loadedCommands}`,
          children: Array.from(this.commands.values())
            .filter((cmd) => cmd.shopInfo)
            .map((cmd) => ({
              label: `${cmd.name} - ${cmd.description}`,
              children: [],
            })),
        },
      ],
    };
  }
}
