/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import {
  ChatInputApplicationCommandData,
  CommandInteraction,
  CommandInteractionOptionResolver,
  GuildMember,
  Message,
  PermissionResolvable,
} from "discord.js";
import TheophilusX from "../structures/TheophilusX";

export interface GuildInteraction extends CommandInteraction {
  member: GuildMember;
}
interface ExecuteOptions {
  client: TheophilusX;
  interaction: GuildInteraction;
  args: CommandInteractionOptionResolver;
}

type ExecuteFunction = (options: ExecuteOptions) => any;

export interface GuildMessage extends Message<boolean> {
  member: GuildMember;
}
interface TXExecuteOptions {
  client: TheophilusX;
  message: GuildMessage;
  args: string[];
}

type ExecuteTXFunction = (options: TXExecuteOptions) => any;

type CommandType = {
  userPermissions?: PermissionResolvable[] | bigint[];
  botPermissions?: PermissionResolvable[] | bigint[]
  cooldown?: number;
  private?: boolean;
  serverOnly?: boolean;
  execute: ExecuteFunction;
}

export type SlashCommandType = CommandType & ChatInputApplicationCommandData

export type TXCommandType = {
  name: string,
  description: string,
  userPermissions?: PermissionResolvable[] | bigint[];
  botPermissions?: PermissionResolvable[] | bigint[];
  cooldown?: number;
  private?: boolean;
  serverOnly?: boolean
  syntax: string;
  execute: ExecuteTXFunction;
}
