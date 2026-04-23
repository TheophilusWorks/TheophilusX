import Users, { queryUser } from "../../../core/database/model/Users.js";
import { TXIContext } from "../../../core/context/TXContext.js";
import mongoose from "mongoose";

export async function updateUserCoins(amount: number, ctx: TXIContext) {
  let session = await mongoose.startSession();
  let newBalance = 0;

  try {
    await session.withTransaction(async () => {
      let user = await Users.findOneAndUpdate(
        queryUser(ctx.platform, ctx.author.id),
        { $inc: { "economy.coins": amount } },
        { session, returnDocument: "after" },
      );

      newBalance = user?.economy?.coins || 0;
    });
  } finally {
    session.endSession();
  }

  return newBalance;
}
