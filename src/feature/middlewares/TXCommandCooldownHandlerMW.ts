import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import { TXIContext } from "../../core/context/TXContext.js";
import { TXNext } from "../../core/event/TXEventBuilder.js";
import TXMiddleware from "../../core/middleware/TXMiddleware.js";
import instance from "../../instance.js";
import TXICommandArgument from "../../types/TXICommandArgument.js";
import ms from "ms";

export default class TXCommandCooldownHandlerMW extends TXMiddleware<
  "commandCreate" | "adminCommandCreate"
> {
  private NOTIFIED_USERS: Set<string>;
  private COOLDOWN_USERS: TXCooldownManager;

  constructor(cooldownUsers: TXCooldownManager) {
    super();
    this.NOTIFIED_USERS = new Set();
    this.COOLDOWN_USERS = cooldownUsers
  }

  public callback = async (
    ctx: TXIContext,
    cmdQuery: TXICommandArgument,
    next: TXNext,
  ) => {
    try {
      if (ctx.author.isSelf) return;
      let adapter = cmdQuery.adapter;

      let cmd = instance.hasCommand(cmdQuery.command)
        ? instance.getCommand(cmdQuery.command)
        : instance.getCommandAlias(cmdQuery.command);

      ctx.metadata["cmd"] = cmd;

      if (!cmd) return;
      if (cmd.blacklistedPlatform?.includes(ctx.platform)) return;

      let cooldownKey = TXCooldownManager.getCooldownKey(cmdQuery.command, ctx);

      ctx.metadata["cooldownKey"] = cooldownKey;

      let cd = this.COOLDOWN_USERS.getRemainingCooldown(cooldownKey);

      if (cd > 0) {
        if (!this.NOTIFIED_USERS.has(cooldownKey)) {
          await adapter.reply(
            ctx,
            [
              `‗ ↳ ❝ Cooldown ❞`,
              `ೃ⁀➷ Wait ${ms(cd)} before using \`${cmdQuery.command}\` again.`,
            ].join("\n"),
          );
          this.NOTIFIED_USERS.add(cooldownKey);
          setTimeout(() => this.NOTIFIED_USERS.delete(cooldownKey), cd);
        }
        return;
      }

      await next();
    } catch {}
  };
}
