/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../../main";
import { TXEvent } from "../../structures/TXEvent";
import config from "../../../txconfig.json";
import { GuildMessage } from "../../typings/Command";
import capitalizeFirstLetter from "../../utils/capitalizeFirstLetter";
import globalFlags from "../../constants/globalFlags";
import { PrettyLogger as log, LogTag } from "../../utils/PrettyLogger";
import { EmbedBuilder, GuildMember } from "discord.js";
import setEphemeral from "../../utils/setEphemeral";

const cooldowns = new Map<string, number>();

const getKey = (commandName: string, id: string, guildId: string) =>
  `${commandName}-${id}-${guildId}`;

const isOnCooldown = (key: string) => {
  const expiry = cooldowns.get(key);
  if (!expiry) return false;

  const now = Date.now();
  if (now > expiry) {
    cooldowns.delete(key);
    return false;
  }

  return true;
};

const setCooldown = (key: string, durationMs: number) => {
  cooldowns.set(key, Date.now() + durationMs);
};

const getRemainingCooldown = (key: string) => {
  const expiry = cooldowns.get(key);
  if (!expiry) return 0;
  return Math.max(0, (expiry - Date.now()) / 1000);
};

export default new TXEvent("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.command.secondaryPrefix)) return;
  if (!message.guild || !message.member) return;

  const prefix = config.command.secondaryPrefix;
  const msg = message.content.slice(prefix.length);
  const tokens: string[] = msg.trim().split(/ +/);
  const commandName = tokens[0];

  try {
    if (!commandName) return;

    const commandObject = client.txCommands.find(
      (cmd) => cmd.name === commandName,
    );
    if (!commandObject) return;

    const key = getKey(commandName, message.author.id, message.guild.id);

    if (isOnCooldown(key)) {
      const remaining = getRemainingCooldown(key);
      const cooldownEmbed = new EmbedBuilder()
        .setTitle("Command on cooldown")
        .setDescription(`You cannot use the **${commandName}** command yet.`)
        .addFields(
          {
            name: "Command's Cooldown",
            value: `${(commandObject.cooldown || 0) / 1000}s`,
            inline: true,
          },
          {
            name: "Time Remaining",
            value: `${remaining.toFixed(2)}s`,
            inline: true,
          },
        )
        .setColor("Red");

      const reply = await message.reply({ embeds: [cooldownEmbed] });
      await setEphemeral(reply);
      return;
    }

    const args = tokens.slice(1);
    const usedFlags: string[] = [];
    const member = message.member as GuildMember;
    const bot = message.guild.members.me;

    for (const arg of args) {
      const flagPrefix = config.command.flagPrefix;
      if (!arg.startsWith(flagPrefix)) continue;

      const argument = arg.slice(flagPrefix.length);
      usedFlags.push(argument.toLowerCase());
    }

    if (commandObject.serverOnly && !message.guild) return;

    if (
      commandObject.userPermissions &&
      !member.permissions.has(commandObject.userPermissions)
    ) {
      await setEphemeral(
        await message.reply(
          "You don't have enough permission to run this command...",
        ),
      );
      return;
    }

    if (
      commandObject.botPermissions &&
      !bot?.permissions.has(commandObject.botPermissions)
    ) {
      await setEphemeral(
        await message.reply(
          "I don't have enough permission to run this command...",
        ),
      );
      return;
    }

    if (usedFlags.length > 0) {
      const GLOBAL_FLAGS: Record<string, string> = globalFlags(commandObject);
      const lines: string[] = [];

      for (const flag of usedFlags) {
        if (flag in GLOBAL_FLAGS) {
          lines.push(
            `- ${capitalizeFirstLetter(flag)}: **${GLOBAL_FLAGS[flag]}**`,
          );
        }
      }

      if (lines.length === 0) {
        return message.reply(
          `Specified flags (${usedFlags.join(", ")}) not found...`,
        );
      }

      const replyMessage = `# ${commandName} info\n${lines.join("\n")}`;
      return message.reply(replyMessage);
    }

    await commandObject.execute({
      message: message as GuildMessage,
      client,
      args,
    });

    setCooldown(key, commandObject.cooldown || 0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const embed = new EmbedBuilder()
      .setDescription(`**Error message:**\n\`\`\`${errorMessage}\`\`\``)
      .setColor("Red");

    message.channel.send({
      content: `An error occurred whilst executing the command "${commandName}"`,
      embeds: [embed],
    });
  }
});
