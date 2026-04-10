import ms from "ms";
import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import instance from "../../instance.js";

export const COOLDOWN_ADMINS = new TXCooldownManager();
const NOTIFIED_USERS: Set<string> = new Set();

export default new TXEventBuilder("adminCommandCreate", async (cmdQuery) => {
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
    let cmd = instance.hasAdminCommand(cmdQuery.command)
      ? instance.getAdminCommand(cmdQuery.command)
      : instance.getAdminCommandAlias(cmdQuery.command);

    if (!cmd) return;

    if (cmd.blacklistedPlatform?.includes(ctx.platform)) return;

    let cooldownKey = TXCooldownManager.getCooldownKey(cmdQuery.command, ctx);
    let cd = COOLDOWN_ADMINS.getRemainingCooldown(cooldownKey);

    if (cd > 0) {
      if (NOTIFIED_USERS.has(cooldownKey)) return;

      adapter.reply(
        cmdQuery.context,
        `Please wait for ${ms(cd)} before using ${cmdQuery.command} again.`,
      );
      NOTIFIED_USERS.add(cooldownKey);
      return;
    }

    await cmd.execute(cmdQuery);
    COOLDOWN_ADMINS.setCooldown(cooldownKey, cmd.cooldown);
    NOTIFIED_USERS.delete(cooldownKey);
  } catch (err) {
    let e = err as Error;
    adapter.reply(
      cmdQuery.context,
      `An error occurred while executing the command: ${e.message}`,
    );
  }
});
