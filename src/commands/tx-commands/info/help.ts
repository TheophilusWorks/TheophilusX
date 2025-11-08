/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from "discord.js";
import TXCommand from "../../../structures/TXCommand";
import config from "../../../../txconfig.json";
import TheophilusX from "../../../structures/TheophilusX";
import setEphemeral from "../../../utils/setEphemeral";
import { GuildMessage } from "../../../typings/Command";

const PREFIX = config.command.secondaryPrefix;

export default new TXCommand({
  name: "help",
  description: `Displays all \`${PREFIX}\` commands or inspects a specific command`,
  syntax: "help [command_name]",
  cooldown: 10_000,
  execute: async ({ message, args, client }) => {
    if (!args.length) {
      await listAllCommands(client, message);
    } else {
      await inspectCommand(client, message, args);
    }
  },
});

interface CategoryMap {
  name: string;
  value: string;
}

interface CategoryObject {
  [key: string]: string[];
}

function getFormattedCommandList(client: TheophilusX): CategoryMap[] {
  const categoryMap: CategoryMap[] = [];
  const categoryObject: CategoryObject = {};

  for (const command of client.txCommands.values()) {
    const category: string[] = categoryObject[command.category as string];
    if (!Array.isArray(category)) categoryObject[command.category as string] = [];

    categoryObject[command.category as string].push(command.name);
  }

  for (const [category, commands] of Object.entries(categoryObject)) {
    categoryMap.push({ name: category, value: `\`\`\`${commands.join(", ")}\`\`\`` });
  }

  return categoryMap;
}

async function listAllCommands(client: TheophilusX, message: GuildMessage) {
  const fields = getFormattedCommandList(client);

  const extraFields: CategoryMap[] = [
    { name: "Command flags", value: `**(notes)**\n**[optional_argument]**\n**<required_argument>**` },
    { name: "Inspect a Command", value: `Use \`${PREFIX}help [command_name]\` to see command information.` },
    { name: "Example", value: `\`${PREFIX}help ping\`` }
  ];

  const allFields = [...fields, ...extraFields];

  const chunkedFields: CategoryMap[][] = [];
  for (let i = 0; i < allFields.length; i += 25) {
    chunkedFields.push(allFields.slice(i, i + 25));
  }

  let currentPage = 0;
  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(`All \`${PREFIX}\` Commands`)
    .addFields(...chunkedFields[currentPage]);

  const components = chunkedFields.length > 1 ? [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("⬅️ Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(false)
    )
  ] : [];

  const reply = await message.reply({ embeds: [embed], components });
  setEphemeral(reply);

  if (chunkedFields.length <= 1) return;

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 120_000
  });

  collector.on("collect", async interaction => {
    if (interaction.customId === "next") {
      currentPage++;
    } else if (interaction.customId === "prev") {
      currentPage--;
    }

    const newEmbed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle(`All \`${PREFIX}\` Commands`)
      .addFields(...chunkedFields[currentPage]);

    const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("⬅️ Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === chunkedFields.length - 1)
    );

    await interaction.update({ embeds: [newEmbed], components: [newRow] });
  });

  collector.on("end", async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Previous").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("next").setLabel("Next ➡️").setStyle(ButtonStyle.Primary).setDisabled(true)
    );
    await reply.edit({ components: [disabledRow] });
  });
}

async function inspectCommand(client: TheophilusX, message: GuildMessage, args: string[]) {
  const embed = new EmbedBuilder().setColor("Blurple");
  const commands = Array.from(client.txCommands.values());

  for (const arg of args) {
    const command = commands.find(cmd => cmd.name.toLowerCase() === arg.toLowerCase());
    if (!command) {
      embed.addFields({ name: arg, value: "Command not found." });
      continue;
    }

    embed.addFields({
      name: `\`${command.name}\``,
      value: `**Description:** ${command.description || "No description provided."}\n**Syntax:** \`${PREFIX}${command.syntax}\``
    });
  }

  const reply = await message.reply({ embeds: [embed] });
  setEphemeral(reply);
}
