import Users, {
  queryUser,
  initializeUserEconomy,
} from "../../../core/database/model/Users.js";
import { TXIContext } from "../../../core/context/TXContext.js";

interface InitializeUserOptions {
  targetId?: string;
  session?: any;
}

export async function initializeUser(
  ctx: TXIContext,
  options: InitializeUserOptions = {},
) {
  const userId = options.targetId ?? ctx.author.id;

  await Users.findOneAndUpdate(
    queryUser(ctx.platform, userId),
    {
      $set: {
        username: ctx.author.username,
      },
      $setOnInsert: {
        economy: initializeUserEconomy(),
      },
    },
    { upsert: true, ...(options.session ? { session: options.session } : {}) },
  );
}
