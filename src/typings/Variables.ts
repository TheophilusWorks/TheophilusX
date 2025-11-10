import { Guild, GuildMember, User, Channel, Message } from "discord.js";

type TXVariableFunction = (context: any) => any

export interface TXVariableOptions {
  formatter: TXVariableFunction;
  description: string
}

export type TXVariableDefault = {
  placeholder: string
} & TXVariableOptions

export type TXVariableDefaultObject = {
  [key: string]: TXVariableDefault[]
}

export interface TXVariableParserContext {
  user?: User,
  member?: GuildMember,
  guild?: Guild,
  channel?: Channel,
  message?: Message
}
