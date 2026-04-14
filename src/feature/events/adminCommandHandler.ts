import ms from "ms";
import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import instance from "../../instance.js";

export const COOLDOWN_ADMINS = new TXCooldownManager();
const NOTIFIED_USERS: Set<string> = new Set();
const NOTIFIED_ARGS: Set<string> = new Set();

const ARGS_NOTIFY_CD = 5_000;

export default new TXEventBuilder(
  "adminCommandCreate",
  async (ctx, cmdQuery) => {
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

      const argsKey = `${cooldownKey}:args`;
      const replyArgError = async (msg: string) => {
        if (NOTIFIED_ARGS.has(argsKey)) return;
        await adapter.reply(
          ctx,
          [
            `‗ ↳ ❝ Invalid Usage ¡! ❞`,
            `ೃ⁀➷ ${msg}`,
            ``,
            `╭┈  ̗̀➛`,
            `┊ usage : \`${cmd!.usage}\``,
            `┊ help  : \`%help --cmd=${cmd!.name}\``,
            `╰─────────┈➤`,
          ].join("\n"),
        );
        NOTIFIED_ARGS.add(argsKey);
        setTimeout(() => NOTIFIED_ARGS.delete(argsKey), ARGS_NOTIFY_CD);
      };

      if (cmd.minimumMentions > ctx.mentions.length) {
        await replyArgError(
          `Not enough mentions — expected ${cmd.minimumMentions}, got ${ctx.mentions.length}.`,
        );
        return;
      }

      if (cmd.minimumArguments > cmdQuery.args.length) {
        await replyArgError(
          `Not enough arguments — expected ${cmd.minimumArguments}, got ${cmdQuery.args.length}.`,
        );
        return;
      }

      if (cmd.minimumGroupedArguments > cmdQuery.groupedArgs.length) {
        await replyArgError(
          `Not enough grouped arguments — expected ${cmd.minimumGroupedArguments}, got ${cmdQuery.groupedArgs.length}.`,
        );
        return;
      }

      await cmd.execute(ctx, cmdQuery);
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
  },
);
