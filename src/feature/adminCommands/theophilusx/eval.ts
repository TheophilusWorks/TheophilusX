import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "eval",
  description: "evalutes JavaScript code and returns the result",
  usage: "eval <code>",
  minimumArguments: 1,
  minimumGroupedArguments: 0,
  cooldown: 5_000,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    let value = eval(args.join(" "));
    await adapter.reply(ctx, `return value: ${value}`);
  },
});
