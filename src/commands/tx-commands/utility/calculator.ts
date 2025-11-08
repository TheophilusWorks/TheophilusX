import { EmbedBuilder } from "discord.js";
import TXCommand from "../../../structures/TXCommand";
import isNumber from "../../../utils/isNumber";
import setEphemeral from "../../../utils/setEphemeral";

export default new TXCommand({
  name: "calculate",
  description: "Calculates basic math expression, e.g: 2+sqrt(8) (2+√8)",
  syntax: "calculate <expression>",
  cooldown: 3000,
  execute: async ({ message, args }) => {
    const expression = args.join("");
    const response = await fetch(`https://api.mathjs.org/v4/?expr=${encodeURIComponent(expression)}`);

    const answerResponse = await response.text();
    const embed = new EmbedBuilder().setColor("Blurple");

    if (!isNumber(answerResponse)) {
      embed.setDescription(answerResponse);
      const reply = await message.reply({ embeds: [embed] });
      return setEphemeral(reply);
    }

    const answer = Number(answerResponse);
    embed.setDescription(`Answer: **${answer}**`);

    // a little easter egg lol
    if (answer === 69) embed.setDescription(`Answer: **${answer}**\n\nNice 😏`);

    message.reply({ embeds: [embed] });
  },
});
