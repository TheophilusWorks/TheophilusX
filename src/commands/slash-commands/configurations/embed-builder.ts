/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
*/

import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ColorResolvable,
} from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";
import GuildConfigs from "../../../database/models/GuildConfigs";
import TXVariable from "../../../structures/TXVariables";

export default new TXSlashCommand({
  name: "embed-builder",
  description: "Create, manage, and preview custom embeds",
  userPermissions: [PermissionFlagsBits.ManageGuild],
  serverOnly: true,
  options: [
    {
      name: "add",
      description: "Create a new embed template",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "embed-name",
          description: "Unique name for this embed",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "title",
          description: "Embed title",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "description",
          description: "Embed description",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "color",
          description: "Hex color code (e.g., #5865F2)",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "title-url",
          description: "URL for clickable title",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "author-name",
          description: "Author name",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "author-icon",
          description: "Author icon URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "author-url",
          description: "Author URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "image",
          description: "Image URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "thumbnail",
          description: "Thumbnail URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "footer",
          description: "Footer text",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "footer-icon",
          description: "Footer icon URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "timestamp",
          description: "Show timestamp?",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: "view",
      description: "Preview an embed template",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "embed-name",
          description: "Name of the embed to preview",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "List all embed templates in this server",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "set",
      description: "Update an existing embed template",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "embed-name",
          description: "Name of the embed to update",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "title",
          description: "New embed title",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "description",
          description: "New embed description",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "color",
          description: "New hex color code",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "title-url",
          description: "New title URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "author-name",
          description: "New author name",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "author-icon",
          description: "New author icon URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "author-url",
          description: "New author URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "image",
          description: "New image URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "thumbnail",
          description: "New thumbnail URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "footer",
          description: "New footer text",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "footer-icon",
          description: "New footer icon URL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "timestamp",
          description: "Show timestamp?",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: "delete",
      description: "Delete an embed template",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "embed-name",
          description: "Name of the embed to delete",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],
  execute: async ({ interaction, args }) => {
    const subcommand = args.getSubcommand();
    const guildId = interaction.guildId!;

    let guildConfig = await GuildConfigs.findOne({ guildId });
    
    if (!subcommand) {
      return interaction.editReply({ 
        content: "Invalid subcommand!"
      });
    }

    if (!guildConfig) {
      guildConfig = await GuildConfigs.create({ guildId, embeds: [] });
    }

    // Helper function to build embed from data
    const buildEmbed = async (embedData: any, context: any) => {
      const variableParser = new TXVariable();

      const parsedTitle = embedData.title
        ? await variableParser.parse(embedData.title, context)
        : null;
      const parsedDescription = embedData.description
        ? await variableParser.parse(embedData.description, context)
        : null;
      const parsedFooter = embedData.footer
        ? await variableParser.parse(embedData.footer, context)
        : null;

      const embed = new EmbedBuilder().setColor(
        embedData.color as ColorResolvable,
      );

      if (parsedTitle) embed.setTitle(parsedTitle);
      if (parsedDescription) embed.setDescription(parsedDescription);
      
      if (embedData.url) {
        const parsedUrl = await variableParser.parse(embedData.url, context);
        if (parsedUrl) embed.setURL(parsedUrl);
      }
      
      if (embedData.image) {
        const parsedImage = await variableParser.parse(embedData.image, context);
        if (parsedImage) embed.setImage(parsedImage);
      }
      
      if (embedData.thumbnail) {
        const parsedThumbnail = await variableParser.parse(embedData.thumbnail, context);
        if (parsedThumbnail) embed.setThumbnail(parsedThumbnail);
      }
      
      if (embedData.timestamp) embed.setTimestamp();

      if (embedData.author?.name) {
        const parsedAuthorName = await variableParser.parse(embedData.author.name, context);
        
        if (parsedAuthorName) {
          const authorData: any = {
            name: parsedAuthorName,
          };
          
          if (embedData.author.iconURL) {
            const parsedIconURL = await variableParser.parse(embedData.author.iconURL, context);
            if (parsedIconURL) authorData.iconURL = parsedIconURL;
          }
          
          if (embedData.author.url) {
            const parsedAuthorUrl = await variableParser.parse(embedData.author.url, context);
            if (parsedAuthorUrl) authorData.url = parsedAuthorUrl;
          }
          
          embed.setAuthor(authorData);
        }
      }

      if (parsedFooter) {
        const footerData: any = { text: parsedFooter };
        
        if (embedData.footerIconURL) {
          const parsedFooterIcon = await variableParser.parse(embedData.footerIconURL, context);
          if (parsedFooterIcon) footerData.iconURL = parsedFooterIcon;
        }
        
        embed.setFooter(footerData);
      }

      if (embedData.fields && embedData.fields.length > 0) {
        for (const field of embedData.fields) {
          const parsedName = await variableParser.parse(field.name, context);
          const parsedValue = await variableParser.parse(field.value, context);
          
          if (parsedName && parsedValue) {
            embed.addFields({
              name: parsedName,
              value: parsedValue,
              inline: field.inline ?? false,
            });
          }
        }
      }

      return embed;
    };

    const context = {
      user: interaction.user,
      member: interaction.member,
      guild: interaction.guild!,
      channel: interaction.channel!,
    };

    switch (subcommand) {
      case "add": {
        const embedName = args.getString("embed-name", true);
        const title = args.getString("title");
        const description = args.getString("description");
        const color = args.getString("color") || "#5865F2";
        const titleUrl = args.getString("title-url");
        const authorName = args.getString("author-name");
        const authorIcon = args.getString("author-icon");
        const authorUrl = args.getString("author-url");
        const image = args.getString("image");
        const thumbnail = args.getString("thumbnail");
        const footer = args.getString("footer");
        const footerIcon = args.getString("footer-icon");
        const timestamp = args.getBoolean("timestamp") || false;

        if (
          !title &&
          !description &&
          !titleUrl &&
          !authorName &&
          !authorIcon &&
          !authorUrl &&
          !image &&
          !thumbnail &&
          !footer &&
          !footerIcon &&
          !timestamp
        ) {
          return interaction.reply({
            content:
              "You must provide at least one embed property (e.g. title, description, etc.) — all fields cannot be empty.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const existingEmbed = guildConfig.embeds.find(
          (e: any) => e.name === embedName,
        );
        if (existingEmbed) {
          return interaction.reply({
            content: `An embed with the name \`${embedName}\` already exists. Use \`/embed-builder set\` to update it.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!/^#[0-9A-F]{6}$/i.test(color)) {
          return interaction.reply({
            content: `Invalid color format. Please use hex format like \`#5865F2\`.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const urlRegex = /^https?:\/\/\S+$/i;
        const variableParser = new TXVariable();

        const urlsToValidate = [
          { name: "title URL", value: titleUrl },
          { name: "author icon", value: authorIcon },
          { name: "author URL", value: authorUrl },
          { name: "image", value: image },
          { name: "thumbnail", value: thumbnail },
          { name: "footer icon", value: footerIcon },
        ];

        for (const urlData of urlsToValidate) {
          if (!urlData.value) continue;

          const parsedUrl = await variableParser.parse(urlData.value, context);

          if (parsedUrl && !urlRegex.test(parsedUrl.trim())) {
            return interaction.reply({
              content: `Invalid ${urlData.name} URL. Must start with http:// or https://, ${urlData.value}`,
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        let author = null;
        if (authorName) {
          author = {
            name: authorName,
            iconURL: authorIcon || null,
            url: authorUrl || null,
          };
        }

        const newEmbed = {
          name: embedName,
          title: title || null,
          description: description || null,
          color,
          url: titleUrl || null,
          image: image || null,
          thumbnail: thumbnail || null,
          footer: footer || null,
          footerIconURL: footerIcon || null,
          timestamp,
          author,
        };

        guildConfig.embeds.push(newEmbed);
        await guildConfig.save();

        const previewEmbed = await buildEmbed(newEmbed, context);

        return interaction.reply({
          content: `Successfully created embed template \`${embedName}\`!\n\n**Preview:**`,
          embeds: [previewEmbed],
        });
      }

      case "view": {
        const embedName = args.getString("embed-name", true);

        const embedData = guildConfig.embeds.find(
          (e: any) => e.name === embedName,
        );
        if (!embedData) {
          return interaction.reply({
            content: `Embed template \`${embedName}\` not found.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const previewEmbed = await buildEmbed(embedData, context);

        return interaction.reply({
          content: `**Preview of \`${embedName}\`:**`,
          embeds: [previewEmbed],
        });
      }

      case "list": {
        if (guildConfig.embeds.length === 0) {
          return interaction.reply({
            content: "No embed templates found in this server.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const embedList = guildConfig.embeds
          .map((e: any, index: number) => {
            return `**${index + 1}.** \`${e.name}\`\n└ Title: ${e.title || "None"}`;
          })
          .join("\n\n");

        const listEmbed = new EmbedBuilder()
          .setTitle("Embed Templates")
          .setDescription(embedList)
          .setColor("Blurple")
          .setFooter({ text: `Total: ${guildConfig.embeds.length} embeds` });

        return interaction.reply({
          embeds: [listEmbed],
        });
      }

      case "set": {
        const embedName = args.getString("embed-name", true);
        const title = args.getString("title");
        const description = args.getString("description");
        const color = args.getString("color");
        const titleUrl = args.getString("title-url");
        const authorName = args.getString("author-name");
        const authorIcon = args.getString("author-icon");
        const authorUrl = args.getString("author-url");
        const image = args.getString("image");
        const thumbnail = args.getString("thumbnail");
        const footer = args.getString("footer");
        const footerIcon = args.getString("footer-icon");
        const timestamp = args.getBoolean("timestamp");

        if (
          title === null &&
          description === null &&
          color === null &&
          titleUrl === null &&
          authorName === null &&
          authorIcon === null &&
          authorUrl === null &&
          image === null &&
          thumbnail === null &&
          footer === null &&
          footerIcon === null &&
          timestamp === null
        ) {
          return interaction.reply({
            content:
              "You must provide at least one embed property to update.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const embedIndex = guildConfig.embeds.findIndex(
          (e: any) => e.name === embedName,
        );
        if (embedIndex === -1) {
          return interaction.reply({
            content: `Embed template \`${embedName}\` not found.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
          return interaction.reply({
            content: `Invalid color format. Please use hex format like \`#5865F2\`.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const urlRegex = /^https?:\/\/\S+$/i;
        const variableParser = new TXVariable();

        const urlsToValidate = [
          { name: "title URL", value: titleUrl },
          { name: "author icon", value: authorIcon },
          { name: "author URL", value: authorUrl },
          { name: "image", value: image },
          { name: "thumbnail", value: thumbnail },
          { name: "footer icon", value: footerIcon },
        ];

        for (const urlData of urlsToValidate) {
          if (!urlData.value) continue;

          const parsedUrl = await variableParser.parse(urlData.value, context);

          if (parsedUrl && !urlRegex.test(parsedUrl.trim())) {
            return interaction.reply({
              content: `Invalid ${urlData.name} URL. Must start with http:// or https://, ${urlData.value}`,
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        const embed = guildConfig.embeds[embedIndex];
        if (title !== null) embed.title = title;
        if (description !== null) embed.description = description;
        if (color) embed.color = color;
        if (titleUrl !== null) embed.url = titleUrl;
        if (image !== null) embed.image = image;
        if (thumbnail !== null) embed.thumbnail = thumbnail;
        if (footer !== null) embed.footer = footer;
        if (footerIcon !== null) embed.footerIconURL = footerIcon;
        if (timestamp !== null) embed.timestamp = timestamp;

        if (authorName || authorIcon || authorUrl) {
          if (!embed.author) {
            embed.author = {
              name: "",
              iconURL: null,
              url: null,
            };
          }
          if (authorName) embed.author.name = authorName;
          if (authorIcon !== null) embed.author.iconURL = authorIcon;
          if (authorUrl !== null) embed.author.url = authorUrl;
        }

        await guildConfig.save();

        const previewEmbed = await buildEmbed(embed, context);

        return interaction.reply({
          content: `Successfully updated embed template \`${embedName}\`!\n\n**Updated Preview:**`,
          embeds: [previewEmbed],
        });
      }

      case "delete": {
        const embedName = args.getString("embed-name", true);

        const embedIndex = guildConfig.embeds.findIndex(
          (e: any) => e.name === embedName,
        );
        if (embedIndex === -1) {
          return interaction.reply({
            content: `Embed template \`${embedName}\` not found.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        guildConfig.embeds.splice(embedIndex, 1);
        await guildConfig.save();

        return interaction.reply({
          content: `Successfully deleted embed template \`${embedName}\`.`,
        });
      }

      default:
        return interaction.reply({
          content: "Invalid subcommand.",
          flags: MessageFlags.Ephemeral,
        });
    }
  },
});
