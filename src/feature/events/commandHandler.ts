import ms from "ms";
import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import instance from "../../instance.js";

export const COOLDOWN_USERS = new TXCooldownManager();
const NOTIFIED_USERS: Set<string> = new Set();

export default new TXEventBuilder("commandCreate", async (cmdQuery) => {
  if (instance.isUpdating()) return;

  let ctx = cmdQuery.context;
  let adapter = cmdQuery.adapter;

  if (instance.isReloading) {
    await adapter.reply(
      ctx,
      `Cannot execute command "${cmdQuery.command}". I'm currently reloading`,
    );
    return;
  }

  try {
    if (ctx.author.isSelf) return;

    let cmd = instance.hasCommand(cmdQuery.command)
      ? instance.getCommand(cmdQuery.command)
      : instance.getCommandAlias(cmdQuery.command);

    if (!cmd) return;
    if (cmd.blacklistedPlatform?.includes(ctx.platform)) return;

    let cooldownKey = TXCooldownManager.getCooldownKey(cmdQuery.command, ctx);
    let cd = COOLDOWN_USERS.getRemainingCooldown(cooldownKey);

    if (cd > 0) {
      if (!NOTIFIED_USERS.has(cooldownKey)) {
        await adapter.reply(
          ctx,
          `Please wait ${ms(cd)} before using ${cmdQuery.command} again.`,
        );
        NOTIFIED_USERS.add(cooldownKey);
        setTimeout(() => NOTIFIED_USERS.delete(cooldownKey), cd);
      }
      return;
    }

    if (cmd.minimumArguments > cmdQuery.args.length) {
      await adapter.reply(
        ctx,
        `Not enough arguments. Expected at least ${cmd.minimumArguments}, got ${cmdQuery.args.length}.`,
      );
      return;
    }

    if (cmd.minimumGroupedArguments > cmdQuery.groupedArgs.length) {
      await adapter.reply(
        ctx,
        `Not enough grouped arguments. Expected at least ${cmd.minimumGroupedArguments}, got ${cmdQuery.groupedArgs.length}.`,
      );
      return;
    }

    await cmd.execute(cmdQuery);
    COOLDOWN_USERS.setCooldown(cooldownKey, cmd.cooldown);
  } catch (err) {
    let e = err as Error;
    await adapter.reply(
      ctx,
      `An error occurred while executing the command: ${e.message}`,
    );
  }
});
