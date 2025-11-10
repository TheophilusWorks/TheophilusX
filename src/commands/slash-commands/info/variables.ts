import { APIEmbedField, EmbedBuilder } from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";
import TXVariable from "../../../structures/TXVariables";
import { TXVariableDefault } from "../../../typings/Variables";

const txVariable = new TXVariable();

export default new TXSlashCommand({
  name: "variables",
  description: "Lists all existing placeholder variables",
  cooldown: 5000,
  execute: async ({ interaction }) => {
    const formattedVariables = getFormattedVariablesArray();
    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("List of all variables")
      .addFields(...formattedVariables);

    await interaction.reply({ embeds: [embed] });
  },
});

function getFormattedVariablesArray() {
  const formattedData: APIEmbedField[] = [];

  const categories = txVariable.listByCategory();
  for (const [category, placeholders] of Object.entries(categories)) {
    const value = placeholders
      .map((p: TXVariableDefault) => `\`${p.placeholder}\` — ${p.description}`)
      .join("\n");

    formattedData.push({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: value || "No variables",
      inline: false,
    });
  }

  return formattedData;
}
