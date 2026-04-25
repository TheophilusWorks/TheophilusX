import TXCommand from "../command/TXCommand.js";
import TXDatabaseManager from "../database/TXDatabaseManager.js";
import TXItemBuilder from "./TXItemBuilder.js";
import { TXIItem } from "./TXIItem.js";
import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";

export default class TXItemManager {
  private commands: Map<string, TXCommand> = new Map();
  private items: Map<string, TXItemBuilder> = new Map();
  private database: TXDatabaseManager;
  private logger: TXLogger;

  constructor(itemsPath: string, database: TXDatabaseManager, logger: TXLogger) {
    this.database = database;
    this.logger = logger
  }

  public getAllSellableCommands(): TXCommand[] {
    return Array.from(this.commands.values());
  }

  public getAllSellableItems(): TXIItem[] {
    return Array.from(this.items.values()).map((builder) => builder.txitem);
  }

  public load() {}
  public toSummaryNode(): TXLoggerNode { return { label: "", children: [] } }
  public reloadModules() { }
}
