import TXAdapterBuilder from "../../core/adapter/TXAdapterBuilder";
import TXCommand from "../../core/command/TXCommand";
import { TXIContext } from "../../core/context/TXContext";

export default new TXCommand({
  name: "ping",
  description: "Replies with Pong!",
  usage: "ping",
  minimumArguments: 0,
  run: async (_ctx: TXIContext, adapter: TXAdapterBuilder) => {
    await adapter.reply("Pong!");
  },
});
