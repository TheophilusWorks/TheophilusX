import TXCommandArgumentBuilder from "../../core/TXCommandArgumentBuilder";
import TXEvent from "../../core/TXEvent";
import { instance } from "../../main";

export default new TXEvent("command", async (ctx, cmdCtx, adapter) => {
  if (ctx.isSelf) return;

  let cmd = instance.getCommand(cmdCtx.name);
  if (!cmd) return;

  let { args, boolValueFlags, stringValueFlags } = cmdCtx;

  let cmdArgs = new TXCommandArgumentBuilder(ctx, adapter)
    .setArgs(args)
    .setStringValueFlags(stringValueFlags)
    .setBoolValueFlags(boolValueFlags)
    .build();

  await cmd.execute(cmdArgs);
});
