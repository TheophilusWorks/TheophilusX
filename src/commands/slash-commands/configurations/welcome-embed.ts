/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { PermissionFlagsBits, ApplicationCommandOptionType, EmbedBuilder } from "discord.js"
import TXSlashCommand from "../../../structures/TXSlashCommand"
import { getMentionablesMap, parseMessage, PLACEHOLDERS } from "../../../constants/mentionableMap"
import GuildConfigs from "../../../database/models/GuildConfigs"

export default new TXSlashCommand({
  name: 'welcome-embed',
  description: "Configure welcome message",
  cooldown: 2000,
  serverOnly: true,
  options: [
    {
      name: "placeholders",
      description: "Dumps all valid placeholders for welcome message",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "toggle",
      description: "Toggles welcome message (on | off)",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "test",
      description: "Sends an embed of how your welcome embed will look like",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "set",
      description: "Sets the welcome message for this server",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "new-message",
          description: "The new welcome message",
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: "new-title",
          description: "The new welcome title",
          type: ApplicationCommandOptionType.String
        }
      ]
    },
  ],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  execute: async ({ interaction, args })=>{
    const subcommand = args.getSubcommand()!
    let guildConfig = await GuildConfigs.findOne({ guildId: interaction.guild?.id })
    if(!guildConfig) guildConfig = new GuildConfigs({ guildId: interaction.guild?.id })

    switch(subcommand){
      case "placeholders":
        const phEmbed = new EmbedBuilder().setColor("Blurple").setTitle("Lists of all available placeholders")

        const formattedPlaceholders = `\`\`\`${getFormattedPlaceholders()}\`\`\``
        phEmbed.setDescription(formattedPlaceholders)
          .addFields({
            name: "Example",
            value: "Welcome to **`{{guild_name}}`**, `{{new_user}}`"
          })
          .addFields({
            name: "Output",
            value: `Welcome to **${interaction.guild?.name}**, ${interaction.user}`
          })

        interaction.reply({ embeds: [phEmbed] })
        break
      
      case "set":
        const newMessage = args.getString("new-message")!
        const newTitle = args.getString("new-title") ?? ""!
        const setEmbed = new EmbedBuilder().setColor("Blurple")

        guildConfig.welcomeMessage = newMessage
        guildConfig.welcomeTitle = newTitle
        await guildConfig.save()

        setEmbed.setDescription(`Successfully changed welcome message to\n\nTitle: ${guildConfig.welcomeTitle}\n\`\`\`${guildConfig.welcomeMessage}\`\`\``)


        interaction.reply({
          embeds: [setEmbed]
        })
        break

      case "toggle":
        guildConfig.welcomeMessageToggle = !guildConfig.welcomeMessageToggle
        guildConfig.save()

        const toggleStatus = guildConfig.welcomeMessageToggle ? "On" : "Off"

        const toggleEmbed = new EmbedBuilder().setDescription(`Toggled welcome messages "${toggleStatus}"`).setColor("Blurple")

        interaction.reply({
          embeds: [toggleEmbed]
        })
        break

      case "test":
        const mentionable = getMentionablesMap(interaction.member)
        const title = parseMessage(guildConfig.welcomeTitle, mentionable)
        const message = parseMessage(guildConfig.welcomeMessage, mentionable)
        const testEmbed = new EmbedBuilder().setTitle(title).setDescription(message).setColor("Blurple")

        interaction.reply({
          embeds: [testEmbed]
        })
        break
    }


  }
})

function getFormattedPlaceholders(){
  const formatted = []
  for(const [k, v] of Object.entries(PLACEHOLDERS)){
    formatted.push(
      `${k} — ${v}`
    )
  }

  return formatted.join("\n")
}
