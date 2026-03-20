import TXCommandBuilder from "../../core/TXCommand";

export default new TXCommandBuilder({
  name: "echo",
  description: "Echoes your message",
  usage: "echo <message>",
  availableFlags: ["repeat"],
  minimumRequiredArguments: 1,
  async execute({ ctx, adapter, args, stringValueFlags }) {
    let repeat = 1;
    let strRepeat = stringValueFlags["repeat"];

    if (strRepeat != null || strRepeat != undefined) {
      let number = parseInt(strRepeat);
      if (isNaN(number)) {
        ctx.reply(`Cannot set --repeat to '${strRepeat}'`);
        return;
      }

      repeat = number;
    }

    let msg = args.join(" ");

    for (let i = 0; i < repeat; i++)
      adapter.sendMessage(ctx.changeContent(msg));
  },
});
