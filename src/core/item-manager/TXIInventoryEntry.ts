export interface TXIInventoryEntry {
  userId: string;
  itemId: string;
  modifier: string;
  acquiredAt: number;
  expiresAt: number | null; // hour
  usesRemaining: number | null; // null == not use-limited
  metadata: Record<string, unknown>;
}
