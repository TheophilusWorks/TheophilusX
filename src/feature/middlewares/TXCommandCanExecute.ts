import { TXIContext } from "../../core/context/TXContext.js";
import { TXNext } from "../../core/event/TXEventBuilder.js";
import TXMiddleware from "../../core/middleware/TXMiddleware.js";
import instance from "../../instance.js";
import TXICommandArgument from "../../types/TXICommandArgument.js";

export default class TXCommandCanExecute extends TXMiddleware<
  "commandCreate" | "adminCommandCreate"
> {
  public static callback = async (
    ctx: TXIContext,
    cmdQuery: TXICommandArgument,
    next: TXNext,
  ) => {
    if (instance.isUpdating()) return;
    if (instance.isTXMigrating) return;

    let adapter = cmdQuery.adapter;

    if (instance.isReloading) {
      await adapter.reply(
        ctx,
        [
          `‗ ↳ ❝ Reloading ❞`,
          `⁀➷ Cannot run \`${cmdQuery.command}\` right now — try again in a moment.`,
        ].join("\n"),
      );
    }

    await next();
  };
}
