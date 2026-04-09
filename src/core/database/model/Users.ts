import { Schema, model, InferSchemaType } from "mongoose";
import { TXPlatform } from "../../context/TXContext.js";

const userSchema = new Schema(
  {
    platform: {
      type: String,
      enum: Object.values(TXPlatform),
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    serverId: {
      type: String,
      required: true,
    },

    economy: {
      coins: {
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
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ platform: 1, userId: 1, serverId: 1 }, { unique: true });

type UserDoc = InferSchemaType<typeof userSchema>;
type UserEconomy = NonNullable<UserDoc["economy"]>;
type UserQuery = Pick<UserDoc, "platform" | "userId" | "serverId">;

export default model("users", userSchema);

export function queryUser(
  platform: TXPlatform,
  serverId: string,
  userId: string,
): UserQuery {
  return {
    platform,
    serverId,
    userId,
  };
}

export function initializeUserEconomy(): UserEconomy {
  return {
    coins: 0,
    bankBalance: 0,
    nextDaily: null,
  };
}
