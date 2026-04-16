import TXDatabaseManager from "../database/TXDatabaseManager.js";
import TXLogger from "../logger/TXLogger.js";
import { DebugLevel } from "../../types/TXDebugLevel.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";
import { TXIInventoryEntry } from "./TXIInventoryEntry.js";
import { TXIItem } from "./TXIItem.js";
import fs from "fs/promises";
import path from "node:path";
import { importDefault } from "../../utils/importDefault.js";
import TXItemBuilder from "./TXItemBuilder.js";

export type TXBuyResult =
  | { success: true; entry: TXIInventoryEntry }
  | {
      success: false;
      reason: "insufficient_funds" | "level_too_low" | "already_owned";
    };

export default class TXItemManager {
  private items: Map<string, TXIItem>;
  private database: TXDatabaseManager;
  private logger: TXLogger;
  private itemsPath: string;

  public itemCount = 0;

  constructor(
    itemsPath: string,
    database: TXDatabaseManager,
    logger: TXLogger,
  ) {
    this.items = new Map();
    this.database = database;
    this.logger = logger.scope("ItemManager");
    this.itemsPath = itemsPath;
  }

  public async reloadModules() {
    this.items = new Map();
    this.itemCount = 0;

    await this.load();
  }

  public async load() {
    this.logger.log(
      `Loading all items in "${this.itemsPath}"`,
      DebugLevel.Info,
    );

    const itemFilepaths = (await fs.readdir(this.itemsPath)).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".js"),
    );

    this.logger.log(`Found ${itemFilepaths.length} item(s)`, DebugLevel.Info);
    for (const itemFile of itemFilepaths) {
      let itemBuilder: TXItemBuilder = await importDefault(
        path.resolve(this.itemsPath, itemFile),
      );
      let item = itemBuilder.item;
      this.items.set(item.name, item);

      this.logger.log(`Loaded item "${item.name}"`, DebugLevel.Ok);
      this.itemCount++;
    }
  }

  // shop
  public async getAvailableItems(): Promise<TXIItem[]> {
    return Array.from(this.items.values());
  }

  public async purchaseItem(
    userId: string,
    itemId: string,
  ): Promise<TXBuyResult> {
    return { success: false, reason: "insufficient_funds" };
  }

  // inventory
  public async getUserInventory(userId: string): Promise<TXIInventoryEntry[]> {
    return [];
  }

  public async getActiveEffect(
    userId: string,
    modifier: string,
  ): Promise<TXIInventoryEntry | null> {
    return null;
  }

  public async consumeItem(userId: string, itemId: string) {}

  public async setItemExpiry(
    userId: string,
    itemId: string,
    expiresAt: number,
  ) {}

  // internal
  private async isItemExpired(entry: TXIInventoryEntry): Promise<boolean> {
    return false;
  }

  private async removeExpiredItems(userId: string) {}

  public toSummaryNode(): TXLoggerNode {
    return {
      label: `Items (${this.itemCount})`,
      children: Array.from(this.items.values()).map((item) => ({
        label: `${item.name} — ${item.price} coins`,
        children: [],
      })),
    };
  }
}
