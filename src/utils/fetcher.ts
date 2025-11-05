/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../main"
import { GuildMember, User, Channel, Role } from "discord.js"

function parseMention(input: string | undefined): string | null {
  if (!input) return null
  const match = input.match(/^<[@#]!?&?(\d+)>$/)
  return match ? match[1] : input
}

export async function fetchUser(input: string | undefined): Promise<User | null> {
  const id = parseMention(input)
  if (!id) return null
  return client.users.cache.get(id) || (await client.users.fetch(id).catch(() => null))
}

export async function fetchMember(input: string | undefined): Promise<GuildMember | null> {
  const id = parseMention(input)
  if (!id) return null
  for (const guild of client.guilds.cache.values()) {
    const cached = guild.members.cache.get(id)
    if (cached) return cached
    const fetched = await guild.members.fetch(id).catch(() => null)
    if (fetched) return fetched
  }
  return null
}

export async function fetchChannel(input: string | undefined): Promise<Channel | null> {
  const id = parseMention(input)
  if (!id) return null
  return client.channels.cache.get(id) || (await client.channels.fetch(id).catch(() => null))
}

export async function fetchRole(input: string | undefined): Promise<Role | null> {
  const id = parseMention(input)
  if (!id) return null
  for (const guild of client.guilds.cache.values()) {
    const cached = guild.roles.cache.get(id)
    if (cached) return cached
    const fetched = await guild.roles.fetch(id).catch(() => null)
    if (fetched) return fetched
  }
  return null
}
