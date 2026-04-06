import TXEventBuilder from "../../core/event/TXEventBuilder";
import { instance } from "../../main";

export default new TXEventBuilder("commandCreate", async (cmdQuery) => {
  let ctx = cmdQuery.context;
  if (ctx.author.isSelf) return;

  let cmd = instance.getCommand(cmdQuery.command);
  if (!cmd) return;

  cmd.execute(cmdQuery);
});
