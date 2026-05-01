import { TXIItemDependency } from "../../types/TXICommand.js";

export interface TXIItem {
  name: string;
  description: string;
  duration: Date | null,
  expiresAt: Date | null,
  requiredLevel: number;
  requiredTotalExp: number;
  price: number;
  itemDependency: TXIItemDependency[]
}
