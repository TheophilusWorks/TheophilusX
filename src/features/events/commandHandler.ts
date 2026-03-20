import TXCommandArgumentBuilder from "../../core/TXCommandArgumentBuilder";
import TXCooldownHandler from "../../core/TXCooldownHandler";
import TXEvent from "../../core/TXEvent";
import { instance } from "../../main";

const cooldownUsers = new TXCooldownHandler()

export default new TXEvent("command", async (ctx, cmdCtx, adapter) => {
  if (ctx.isSelf) return;

  let cmd = instance.getCommand(cmdCtx.name);
  if (!cmd) return;

let key = cooldownUsers.getCooldownKey({ 
    platform: ctx.platform,
    serverId: ctx.serverId,
    userId: ctx.userId,
    commandNameOnCooldown: cmd.name
  })

  let cooldownContext = {
    platform: ctx.platform,
    serverId: ctx.serverId,
    userId: ctx.userId,
    commandNameOnCooldown: cmd.name,
    cooldown: cmd.cooldown,
    expiresAt: Date.now()+cmd.cooldown,
  }

  if (!cooldownUsers.cooldownExpired(key)) {
    // cooldownContext should be unreachable
    // its just there so typescript shuts up 
    ctx.replyCooldown(cooldownUsers.get(key) || cooldownContext)
    return
  }

  let { args, boolValueFlags, stringValueFlags } = cmdCtx;

  let cmdArgs = new TXCommandArgumentBuilder(ctx, adapter)
    .setArgs(args)
    .setStringValueFlags(stringValueFlags)
    .setBoolValueFlags(boolValueFlags)
    .build();

  await cmd.execute(cmdArgs);

  cooldownUsers.addCooldown(cooldownContext)
});
