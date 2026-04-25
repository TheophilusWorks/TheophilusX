import { Schema, model, InferSchemaType } from "mongoose";
import { TXPlatform } from "../../context/TXContext.js";

const inventorySchema = new Schema(
  {
    commands: {
      type: [String],
      default: [],
    },
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
      default: () => ({ commands: [] }),
    },

    economy: {
      coins: {
        type: Number,
        default: 0,
      },
      totalBalance: {
        type: Number,
        default: 0,
      },
      stealCount: {
        type: Number,
        default: 0,
      },
      level: {
        type: Number,
        default: 0,
      },
      exp: {
        type: Number,
        default: 0,
      },
      totalExp: {
        type: Number,
        default: 0,
      },
      bankBalance: {
        type: Number,
        default: 0,
      },
      nextDaily: {
        type: Date,
        default: null,
      },
      nextWork: {
        type: Date,
        default: null,
      },
      lastStealAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ platform: 1, userId: 1 }, { unique: true });

type UserDoc = InferSchemaType<typeof userSchema>;
type UserEconomy = NonNullable<UserDoc["economy"]>;
type UserInventory = NonNullable<UserDoc["inventory"]>;
type UserQuery = Pick<UserDoc, "platform" | "userId">;

export default model("users", userSchema);

export function queryUser(platform: TXPlatform, userId: string): UserQuery {
  return {
    platform,
    userId,
  };
}

export function initializeUserEconomy(): UserEconomy {
  return {
    coins: 0,
    stealCount: 0,
    bankBalance: 0,
    totalBalance: 0,
    nextDaily: null,
    nextWork: null,
    lastStealAt: null,
    level: 1,
    exp: 0,
    totalExp: 0,
  };
}

export function initializeUserInventory(): UserInventory {
  return {
    commands: [],
  };
}
