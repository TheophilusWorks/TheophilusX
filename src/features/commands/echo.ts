import TXCommandBuilder from "../../core/TXCommand";

const MAX_REPEAT = 10;
const MAX_TOTAL_CHARS = 500;

export default new TXCommandBuilder({
  name: "echo",
  description: "Echos your message",
  usage: "echo <message>",
  availableFlags: ["repeat"],
  minimumRequiredArguments: 1,
  cooldown: 5_000,
  async execute({ ctx, adapter, args, stringValueFlags }) {
    let repeat = 1;
    let msg = args.join(" ");
    let strRepeat = stringValueFlags["repeat"];

    if (strRepeat != null && strRepeat != undefined) {
      let number = parseInt(strRepeat);
      if (isNaN(number) || number < 1) {
        ctx.reply(`Cannot set --repeat to '${strRepeat}'`);
        return;
      }

      let safeCap = Math.floor(MAX_TOTAL_CHARS / msg.length);
      repeat = Math.min(number, MAX_REPEAT, safeCap);
    }

    for (let i = 0; i < repeat; i++)
      await adapter.sendMessage(ctx.changeContent(msg));
  },
});
