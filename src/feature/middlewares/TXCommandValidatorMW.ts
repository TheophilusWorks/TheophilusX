import TXCommand from "../../core/command/TXCommand.js";
import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import { TXIContext } from "../../core/context/TXContext.js";
import { TXNext } from "../../core/event/TXEventBuilder.js";
import TXMiddleware from "../../core/middleware/TXMiddleware.js";
import TXICommandArgument from "../../types/TXICommandArgument.js";

export default class TXCommandValidatorMW extends TXMiddleware<
  "commandCreate" | "adminCommandCreate"
> {
  private static ARGS_NOTIFY_CD = 5_000;
  private NOTIFIED_ARGS: Set<string>;

  constructor() {
    super();
    this.NOTIFIED_ARGS = new Set();
  }

  public callback = async (
    ctx: TXIContext,
    cmdQuery: TXICommandArgument,
    next: TXNext,
  ) => {
    let cmd = ctx.metadata["cmd"] as TXCommand;
    let adapter = cmdQuery.adapter;
    let cooldownKey = TXCooldownManager.getCooldownKey(cmdQuery.command, ctx);
    const argsKey = `${cooldownKey}:args`;

    const replyArgError = async (msg: string) => {
      if (this.NOTIFIED_ARGS.has(argsKey)) return;
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
      this.NOTIFIED_ARGS.add(argsKey);
      setTimeout(
        () => this.NOTIFIED_ARGS.delete(argsKey),
        TXCommandValidatorMW.ARGS_NOTIFY_CD,
      );
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

    await next();
  };
}
