import TXEventBuilder from "../../core/event/TXEventBuilder.js";
import TXCommand from "../../core/command/TXCommand.js";
import TXCommandCanExecute from "../middlewares/TXCommandCanExecute.js";
import TXCommandValidatorMW from "../middlewares/TXCommandValidatorMW.js";
import TXCommandCooldownHandlerMW from "../middlewares/TXCommandCooldownHandlerMW.js";
import { TXIContext } from "../../core/context/TXContext.js";
import TXICommandArgument from "../../types/TXICommandArgument.js";
import TXCooldownManager from "../../core/command/TXCooldownHandler.js";
import instance from "../../instance.js";
import TXCommandOwnershipCheckerMW from "../middlewares/TXCommandOwnershipCheckerMW.js";

export const COOLDOWN_USERS = new TXCooldownManager();

export default new TXEventBuilder(
  "commandCreate",
  TXCommandCanExecute.callback,
  new TXCommandCooldownHandlerMW(
    COOLDOWN_USERS,
    instance.getCommands(),
    instance.getAllCommandAliases(),
  ).callback,
  new TXCommandOwnershipCheckerMW().callback,
  new TXCommandValidatorMW().callback,
  async (ctx: TXIContext, cmdQuery: TXICommandArgument) => {
    let adapter = cmdQuery.adapter;

    try {
      let cmd = ctx.metadata["cmd"] as TXCommand;
      let cooldownKey = ctx.metadata["cooldownKey"] as string;
      await cmd.execute(ctx, cmdQuery);
      COOLDOWN_USERS.setCooldown(cooldownKey, cmd.cooldown);
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
