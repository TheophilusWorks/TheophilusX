import TXCommandBuilder from "../../core/TXCommand";

const MAX_REPEAT = 10;
const MAX_TOTAL_CHARS = 500;

export default new TXCommandBuilder({
  name: "execute",
  description: "Executes batches of commands",
  usage: "execute [<cmd_1>, <cmd_2>, ...]",
  availableFlags: ["amount"],
  minimumRequiredArguments: 1,
  cooldown: 5_000,
  async execute({ ctx, adapter, args, stringValueFlags }) {
    throw new Error("Todo");
  },
});
