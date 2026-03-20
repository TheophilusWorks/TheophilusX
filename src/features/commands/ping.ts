import TXCommandBuilder from "../../core/TXCommand";

export default new TXCommandBuilder({
  name: "ping",
  description: "Pong!",
  usage: "ping",
  availableFlags: [],
  minimumRequiredArguments: 0,
  cooldown: 5_000,
  async execute({ ctx }) {
    let start = Date.now();
    let msg = await ctx.reply("Pinging...");
    let end = Date.now();
    msg.editMsg(`Pong! ${end - start}ms | Current platform: '${ctx.platform}'`);
  },
});
