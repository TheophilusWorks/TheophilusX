import { TXIContext, TXPlatform } from "../core/context/TXContext.js";
import TXICommandArgument from "./TXICommandArgument.js";

export type TXIItemDependency = { commandName: string } | { itemName: string };

export interface TXIShopInfo {
  price?: number;
  requiredLevel?: number;
  requiredTotalExp?: number;
  itemDependency?: TXIItemDependency[]
}

export default interface TXICommand {
  name: string;
  description: string;
  usage: string;
  shopInfo?: TXIShopInfo;

  aliases?: string[];
  blacklistedPlatforms?: TXPlatform[];
  cooldown: number;

  minimumArguments: number;
  minimumMentions: number;
  minimumGroupedArguments: number;
  usedStringFlags?: string[];
  usedBooleanFlags?: string[];

  execute: (ctx: TXIContext, args: TXICommandArgument) => Promise<void>;
}
