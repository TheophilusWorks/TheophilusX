import ms from "ms";
import TXCooldownManager from "../../core/command/TXCooldownHandler";
import TXEventBuilder from "../../core/event/TXEventBuilder";
import instance from "../../instance";

export const COOLDOWN_USERS = new TXCooldownManager();
const NOTIFIED_USERS: Set<string> = new Set();

export default new TXEventBuilder("commandCreate", async (cmdQuery) => {
  let ctx = cmdQuery.context;
  let adapter = cmdQuery.adapter;
  try {
    if (ctx.author.isSelf) return;

    let cooldownKey = TXCooldownManager.getCooldownKey(cmdQuery.command, ctx);
    let cd = COOLDOWN_USERS.getRemainingCooldown(cooldownKey);

    if (cd > 0) {
      if (NOTIFIED_USERS.has(cooldownKey)) return;

      adapter.reply(
        `Please wait for ${ms(cd)} before using ${cmdQuery.command} again.`,
      );
      NOTIFIED_USERS.add(cooldownKey);
      return;
    }

    let cmd = instance.getCommand(cmdQuery.command);
    if (!cmd) return;

    await cmd.execute(cmdQuery);
    COOLDOWN_USERS.setCooldown(cooldownKey, cmd.cooldown);
    NOTIFIED_USERS.delete(cooldownKey);
  } catch (err) {
    let e = err as Error;
    adapter.reply(
      `An error occurred while executing the command: ${e.message}`,
    );
  }
});
