/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../main";
import { TXEvent } from "../structures/TXEvent";
import config from "../../txconfig.json";
import { GuildMessage } from "../typings/Command";
import capitalizeFirstLetter from "../utils/capitalizeFirstLetter";
import globalFlags from "../constants/globalFlags";
import { PrettyLogger as log, LogTag } from "../utils/PrettyLogger";
import { GuildMember } from "discord.js";
import setEphemeral from "../utils/setEphemeral";

export default new TXEvent("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.secondaryPrefix)) return;
  if (!message.guild || !message.member) return;

  const prefix = config.secondaryPrefix;
  const msg = message.content.slice(prefix.length);
  const tokens: string[] = msg.trim().split(/ +/);
  const usedFlags: string[] = [];
  const member = message.member as GuildMember
  const bot = message.guild.members.me

  const commandName = tokens[0];
  const args = tokens.slice(1);

  if (!commandName) return;

  for (const arg of args) {
    const flagPrefix = config.commandFlagPrefix;
    if (!arg.startsWith(flagPrefix)) continue;

    const argument = arg.slice(flagPrefix.length);
    usedFlags.push(argument.toLowerCase());
  }

  const commandObject = client.txCommands.find((cmd) => cmd.name === commandName);
  if (!commandObject) return;

  if(commandObject.serverOnly && !message.guild) return
  
  if(commandObject.userPermissions && !member.permissions.has(commandObject.userPermissions))
    return setEphemeral(await message.reply("You don't have enough permission to run this command..."))

  if(commandObject.botPermissions && !bot?.permissions.has(commandObject.botPermissions))
    return setEphemeral(await message.reply("I don't have enough permission to run this command..."))

  if (usedFlags.length > 0) {
    const GLOBAL_FLAGS: Record<string, string> = globalFlags(commandObject)
    const lines: string[] = [];

    for (const flag of usedFlags) {
      if (flag in GLOBAL_FLAGS) {
        lines.push(`- ${capitalizeFirstLetter(flag)}: **${GLOBAL_FLAGS[flag]}**`);
      }
    }

    if (lines.length === 0) {
      return message.reply(`Specified flags (${usedFlags.join(", ")}) not found...`);
    }

    const replyMessage = `# ${commandName} info\n${lines.join("\n")}`;
    return message.reply(replyMessage);
  }

  try {
    commandObject.execute({
      message: message as GuildMessage,
      client,
      args,
    });
  } catch (error) {
    log.error({
      message: `An error occurred whilst executing the TX-comand "${commandName}"`,
      tag: LogTag.COMMANDS,
      extra: [error]
    })
  }
});
