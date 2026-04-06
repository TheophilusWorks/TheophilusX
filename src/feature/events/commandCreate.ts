import TXEventBuilder from "../../core/event/TXEventBuilder";
import { instance } from "../../main";

export default new TXEventBuilder("commandCreate", async (cmdQuery, adapter, ctx) => {
  if (ctx.author.isSelf) return;

  let cmd = instance.getCommands()
})
