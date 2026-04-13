import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";

export default new TXCommand({
  name: "setbalance",
  description: "Shows your balance",
  usage: "setbalance <user> <coin | bank> <amount>",
  minimumArguments: 2,
  minimumMentions: 1,
  aliases: ["setbal", "sb"],
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, context }) => {
  },
});
