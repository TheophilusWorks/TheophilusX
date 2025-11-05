/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import TXCommand from "../../../structures/TXCommand";
import config from "../../../../txconfig.json";
import { EmbedBuilder } from "discord.js";
import TheophilusX from "../../../structures/TheophilusX";
import { GuildMessage } from "../../../typings/Command";
import setEphemeral from "../../../utils/setEphemeral";

const PREFIX = config.secondaryPrefix;

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

function getFormattedCommandList(client: TheophilusX) {
  const commands = Array.from(client.txCommands.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return commands.length ? commands.map(cmd => `\`${cmd.name}\``).join(", ") : "No commands available.";
}

async function listAllCommands(client: TheophilusX, message: GuildMessage) {
  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(`All \`${PREFIX}\` Commands`)
    .setDescription(getFormattedCommandList(client))
    .addFields(
      { name: "Inspect a Command", value: `Use \`${PREFIX}help <command_name>\` to see details.` },
      { name: "Example", value: `\`${PREFIX}help ping\`` }
    );

  const reply = await message.reply({ embeds: [embed] });
  setEphemeral(reply);
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
