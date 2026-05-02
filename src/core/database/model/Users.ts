import { Schema, model, InferSchemaType } from "mongoose";
import { TXPlatform } from "../../context/TXContext.js";
import { TXIInventory } from "../../item-manager/TXItemInventory.js";

const itemSchema = new Schema(
  {
    itemName: {
      type: String,
      default: "Unknown",
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const inventorySchema = new Schema(
  {
    commands: { type: [String], default: [] },
    items: { type: [itemSchema], default: [] },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    platform: {
      type: String,
      enum: Object.values(TXPlatform),
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },

    inventory: {
      type: inventorySchema,
      default: () => ({ commands: [], items: [] }),
    },

    economy: {
      coins: { type: Number, default: 0 },
      totalBalance: { type: Number, default: 0 },
      stealCount: { type: Number, default: 0 },
      coinsAcceptCount: { type: Number, default: 0 },
      wordleBetCount: { type: Number, default: 0 },
      level: { type: Number, default: 0 },
      exp: { type: Number, default: 0 },
      totalExp: { type: Number, default: 0 },
      bankBalance: { type: Number, default: 0 },
      nextDaily: { type: Number, default: 0 },
      nextWordleBet: { type: Number, default: 0 },
      nextCoinsAccept: { type: Number, default: 0 },
      nextWork: { type: Number, default: 0 },
      lastStealAt: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

userSchema.index({ platform: 1, userId: 1 }, { unique: true });

type UserDoc = InferSchemaType<typeof userSchema>;
type UserEconomy = NonNullable<UserDoc["economy"]>;
type UserInventory = NonNullable<UserDoc["inventory"]>;
type UserQuery = Pick<UserDoc, "platform" | "userId">;

export default model("users", userSchema);

export function queryUser(platform: TXPlatform, userId: string): UserQuery {
  return { platform, userId };
}

export function initializeUserEconomy(): UserEconomy {
  return {
    coins: 0,
    stealCount: 0,
    coinsAcceptCount: 0,
    wordleBetCount: 0,
    bankBalance: 0,
    totalBalance: 0,
    nextDaily: 0,
    nextWork: 0,
    lastStealAt: 0,
    nextWordleBet: 0,
    nextCoinsAccept: 0,
    level: 1,
    exp: 0,
    totalExp: 0,
  };
}

export function initializeUserInventory(): TXIInventory {
  return {
    commands: [],
    items: [],
  };
}
