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
      [
        `‗ ↳ ❝ Reloading ❞`,
        `⁀➷ Cannot run \`${cmdQuery.command}\` right now — try again in a moment.`,
      ].join("\n"),
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
      await adapter.reply(
        ctx,
        [
          `‗ ↳ ❝ Cooldown ❞`,
          `ೃ⁀➷ Wait ${ms(cd)} before using \`${cmdQuery.command}\` again.`,
        ].join("\n"),
      );
      NOTIFIED_USERS.add(cooldownKey);
      setTimeout(() => NOTIFIED_USERS.delete(cooldownKey), cd);
      return;
    }

    if (cmd.minimumArguments > cmdQuery.args.length) {
      await adapter.reply(
        ctx,
        [
          `‗ ↳ ❝ Invalid Usage ¡! ❞`,
          `ೃ⁀➷ Not enough arguments — expected ${cmd.minimumArguments}, got ${cmdQuery.args.length}.`,
          ``,
          `╭┈  ̗̀➛`,
          `┊ usage : \`${cmd.usage}\``,
          `┊ help  : \`%help --cmd=${cmd.name}\``,
          `╰─────────┈➤`,
        ].join("\n"),
      );
      return;
    }

    if (cmd.minimumGroupedArguments > cmdQuery.groupedArgs.length) {
      await adapter.reply(
        ctx,
        [
          `‗ ↳ ❝ Invalid Usage ¡! ❞`,
          `ೃ⁀➷ Not enough grouped arguments — expected ${cmd.minimumGroupedArguments}, got ${cmdQuery.groupedArgs.length}.`,
          ``,
          `╭┈  ̗̀➛`,
          `┊ usage : \`${cmd.usage}\``,
          `┊ help  : \`%help --cmd=${cmd.name}\``,
          `╰─────────┈➤`,
        ].join("\n"),
      );
      return;
    }

    await cmd.execute(cmdQuery);
    COOLDOWN_ADMINS.setCooldown(cooldownKey, cmd.cooldown);
    NOTIFIED_USERS.delete(cooldownKey);
  } catch (err) {
    let e = err as Error;
    await adapter.reply(
      ctx,
      [
        `‗ ↳ ❝ Error ¡! ❞`,
        `ೃ⁀➷ Something went wrong running \`${cmdQuery.command}\`.`,
        ``,
        `╭┈  ̗̀➛`,
        `┊ ${e.message}`,
        `╰─────────┈➤`,
      ].join("\n"),
    );
  }
});
