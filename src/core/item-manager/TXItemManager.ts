import TXDatabaseManager from "../database/TXDatabaseManager.js";
import { TXIInventoryEntry } from "./TXIInventoryEntry.js";
import { TXIItem } from "./TXIItem.js";

export type TXBuyResult =
  | { success: true; entry: TXIInventoryEntry }
  | {
      success: false;
      reason: "insufficient_funds" | "level_too_low" | "already_owned";
    };

class TXItemManager {
  private items: TXIItem[];

  constructor(private database: TXDatabaseManager) {
    this.items = [];
  }

  // shop
  public async getAvailableItems(): Promise<TXIItem[]> {
    return this.items;
  }

  public async purchaseItem(
    userId: string,
    itemId: string,
  ): Promise<TXBuyResult> {
    // temp
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

  public async consumeItem(userId: string, itemId: string): Promise<void> {}

  public async setItemExpiry(
    userId: string,
    itemId: string,
    expiresAt: number,
  ): Promise<void> {
    return;
  }

  // internal
  private async isItemExpired(entry: TXIInventoryEntry): Promise<boolean> {
    return false;
  }

  private async removeExpiredItems(userId: string): Promise<void> {}
}
