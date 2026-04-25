import { TXIContext } from "../../core/context/TXContext.js";
import { TXNext } from "../../core/event/TXEventBuilder.js";
import TXMiddleware from "../../core/middleware/TXMiddleware.js";
import TXICommandArgument from "../../types/TXICommandArgument.js";
import { initializeUser } from "../utils/database/initializeUser.js";
import Users, { queryUser } from "../../core/database/model/Users.js";
import TXCommand from "../../core/command/TXCommand.js";

const NOTIFIED_USERS = new Map<string, number>();
const NOTIFY_COOLDOWN = 25_000;

export default class TXCommandOwnershipCheckerMW extends TXMiddleware<
  "commandCreate" | "adminCommandCreate"
> {
  constructor() {
    super();
  }

  public callback = async (
    ctx: TXIContext,
    cmdQuery: TXICommandArgument,
    next: TXNext,
  ) => {
    await initializeUser(ctx);
    let adapter = cmdQuery.adapter;
    // TODO: Add cacher to this
    let user = await Users.findOne(queryUser(ctx.platform, ctx.author.id));

    // unreachable code, but just in case
    if (!user) return;

    let inventory = user.inventory;
    let cmd = ctx.metadata["cmd"] as TXCommand;

    // not for sale
    if (!cmd.shopInfo) {
      await next();
      return;
    }

    if (!inventory.commands.includes(cmd.name)) {
      let key = `${ctx.platform}-${cmd.name}-${ctx.author.id}`;
      let cooldown = NOTIFIED_USERS.get(key) || 0;
      let now = Date.now();

      if (cooldown > now) return;
      await adapter.reply(ctx, `
‗   ↳ ❝ [ Commands ] ¡! ❞
ೃ⁀➷ You don't have access to this command!
         ◇─◇───◇─◇

╭┈─ command locked ◌ೄˊˎ
┊ This command has not been purchased yet.
┊ Visit the shop to unlock it!
╰──────┈➤ ❝ [ Locked ]

𓆩⟡𓆪 Type \`%shop commands ${cmd.name}\` to buy and unlock this command
`);

      NOTIFIED_USERS.set(key, now + NOTIFY_COOLDOWN);
      setTimeout(() => NOTIFIED_USERS.delete(key), NOTIFY_COOLDOWN);
      return;
    }
    await next();
  };
}
