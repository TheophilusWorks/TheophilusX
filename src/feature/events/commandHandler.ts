import ms from "ms";
import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import instance from "../../instance.js";

export const COOLDOWN_USERS = new TXCooldownManager();
const NOTIFIED_USERS: Set<string> = new Set();

export default new TXEventBuilder("commandCreate", async (cmdQuery) => {
  let ctx = cmdQuery.context;
  let adapter = cmdQuery.adapter;

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
      if (NOTIFIED_USERS.has(cooldownKey)) return;

      adapter.reply(
        cmdQuery.context,
        `Please wait for ${ms(cd)} before using ${cmdQuery.command} again.`,
      );
      NOTIFIED_USERS.add(cooldownKey);
      return;
    }

    await cmd.execute(cmdQuery);
    COOLDOWN_USERS.setCooldown(cooldownKey, cmd.cooldown);
    NOTIFIED_USERS.delete(cooldownKey);
  } catch (err) {
    let e = err as Error;
    adapter.reply(
      cmdQuery.context,
      `An error occurred while executing the command: ${e.message}`,
    );
  }
});
