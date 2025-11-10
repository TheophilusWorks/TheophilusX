/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import { client } from "../main";
import { TXVariableDefaultObject, TXVariableOptions, TXVariableParserContext } from "../typings/Variables";
import config from "../../txconfig.json";

export default class TXVariable {
  private placeholders = new Map<string, TXVariableOptions>();
  private categorizedPlaceholders: TXVariableDefaultObject = {};

  constructor() {
    this.registerDefaultVariables();
  }

  public list() {
    return this.placeholders;
  }

  public listByCategory() {
    return this.categorizedPlaceholders;
  }

  public append(template: string, options: TXVariableOptions) {
    this.placeholders.set(template, options);
  }

  public async parse(message: string, context: TXVariableParserContext) {
    const tokens = message.split(/(\\?\{.*?\})/g);
    let parsed = "";

    for (let token of tokens) {
      if (!token) continue;

      if (token.startsWith("\\") && token.endsWith("\\")) {
        parsed += token.slice(1);
        continue;
      }

      const variable = this.placeholders.get(token);
      if (variable) {
        try {
          const formatted = await variable.formatter(context);

          parsed += String(formatted ?? "Unknown");
        } catch (err) {
          parsed += "Unknown";
        }
      } else {
        parsed += token;
      }
    }

    return parsed;
  }

  private registerDefaultVariables() {
    const DEFAULT_VARIABLE_PLACEHOLDERS: TXVariableDefaultObject = {
      user: [
        {
          placeholder: "{user}",
          description: "Mentions the event emitter (user)",
          formatter: (context: TXVariableParserContext) => context.user?.toString(),
        },
        {
          placeholder: "{user.displayName}",
          description: "Returns the user's display name",
          formatter: (context: TXVariableParserContext) => context.user?.displayName,
        },
        {
          placeholder: "{user.id}",
          description: "Returns the user's ID",
          formatter: (context: TXVariableParserContext) => context.user?.id,
        },
        {
          placeholder: "{user.username}",
          description: "Returns the user's username",
          formatter: (context: TXVariableParserContext) => context.user?.username,
        },
        {
          placeholder: "{user.tag}",
          description: "Returns the user's tag (username#discriminator or just username)",
          formatter: (context: TXVariableParserContext) => context.user?.tag,
        },
        {
          placeholder: "{user.avatar}",
          description: "Returns the user's avatar URL",
          formatter: (context: TXVariableParserContext) => context.user?.displayAvatarURL(),
        },
        {
          placeholder: "{user.createdAt}",
          description: "Returns when the user's account was created",
          formatter: (context: TXVariableParserContext) => context.user?.createdAt?.toLocaleDateString(),
        },
        {
          placeholder: "{user.bot}",
          description: "Returns true if user is a bot",
          formatter: (context: TXVariableParserContext) => context.user?.bot?.toString(),
        },
      ],

      member: [
        {
          placeholder: "{member.nickname}",
          description: "Returns the user's server nickname",
          formatter: (context: TXVariableParserContext) => context.member?.nickname,
        },
        {
          placeholder: "{member.joinedAt}",
          description: "Returns when the member joined the server",
          formatter: (context: TXVariableParserContext) => context.member?.joinedAt?.toLocaleDateString(),
        },
        {
          placeholder: "{member.roles}",
          description: "Returns the count of member's roles",
          formatter: (context: TXVariableParserContext) => context.member?.roles?.cache?.size?.toString(),
        },
        {
          placeholder: "{member.highestRole}",
          description: "Returns the member's highest role name",
          formatter: (context: TXVariableParserContext) => context.member?.roles?.highest?.name,
        },
        {
          placeholder: "{member.color}",
          description: "Returns the member's role color in hex",
          formatter: (context: TXVariableParserContext) => context.member?.displayHexColor,
        },
        {
          placeholder: "{member.displayName}",
          description: "Returns the member's display name (nickname or username)",
          formatter: (context: TXVariableParserContext) => context.member?.displayName,
        },
      ],

      guild: [
        {
          placeholder: "{guild}",
          description: "Displays the guild name",
          formatter: (context: TXVariableParserContext) => context.guild?.name,
        },
        {
          placeholder: "{guild.id}",
          description: "Returns the guild ID",
          formatter: (context: TXVariableParserContext) => context.guild?.id,
        },
        {
          placeholder: "{guild.memberCount}",
          description: "Returns the total member count",
          formatter: (context: TXVariableParserContext) => context.guild?.memberCount?.toString(),
        },
        {
          placeholder: "{guild.icon}",
          description: "Returns the guild icon URL",
          formatter: (context: TXVariableParserContext) => context.guild?.iconURL(),
        },
        {
          placeholder: "{guild.owner}",
          description: "Mentions the guild owner",
          formatter: async (context: TXVariableParserContext) => {
            const owner = await context.guild?.fetchOwner();
            return owner?.user?.toString();
          },
        },
        {
          placeholder: "{guild.ownerId}",
          description: "Returns the guild owner's ID",
          formatter: (context: TXVariableParserContext) => context.guild?.ownerId,
        },
        {
          placeholder: "{guild.createdAt}",
          description: "Returns when the guild was created",
          formatter: (context: TXVariableParserContext) => context.guild?.createdAt?.toLocaleDateString(),
        },
        {
          placeholder: "{guild.boostCount}",
          description: "Returns the number of server boosts",
          formatter: (context: TXVariableParserContext) => context.guild?.premiumSubscriptionCount?.toString(),
        },
        {
          placeholder: "{guild.boostLevel}",
          description: "Returns the server boost level (0-3)",
          formatter: (context: TXVariableParserContext) => context.guild?.premiumTier?.toString(),
        },
        {
          placeholder: "{guild.description}",
          description: "Returns the guild description",
          formatter: (context: TXVariableParserContext) => context.guild?.description,
        },
        {
          placeholder: "{guild.banner}",
          description: "Returns the guild banner URL",
          formatter: (context: TXVariableParserContext) => context.guild?.bannerURL(),
        },
      ],

      channel: [
        {
          placeholder: "{channel}",
          description: "Mentions the channel where the event was emitted",
          formatter: (context: TXVariableParserContext) => context.channel?.toString(),
        },
        {
          placeholder: "{channel.name}",
          description: "Returns the channel name",
          formatter: (context: TXVariableParserContext) => {
            const channel = context.channel;
            if (!channel) return undefined;
            if ('name' in channel) return channel.name as string;
            return undefined;
          },
        },
        {
          placeholder: "{channel.id}",
          description: "Returns the channel ID",
          formatter: (context: TXVariableParserContext) => context.channel?.id,
        },
        {
          placeholder: "{channel.type}",
          description: "Returns the channel type",
          formatter: (context: TXVariableParserContext) => context.channel?.type?.toString(),
        },
        {
          placeholder: "{channel.url}",
          description: "Returns the channel URL",
          formatter: (context: TXVariableParserContext) => {
            const channel = context.channel;
            if (!channel) return undefined;
            if ('url' in channel) return channel.url as string;
            return undefined;
          },
        },
      ],

      datetime: [
        {
          placeholder: "{date}",
          description: "Returns the current date",
          formatter: () => new Date().toLocaleDateString(),
        },
        {
          placeholder: "{time}",
          description: "Returns the current time",
          formatter: () => new Date().toLocaleTimeString(),
        },
        {
          placeholder: "{timestamp}",
          description: "Returns the current Unix timestamp",
          formatter: () => Math.floor(Date.now() / 1000).toString(),
        },
        {
          placeholder: "{datetime}",
          description: "Returns the current date and time",
          formatter: () => new Date().toLocaleString(),
        },
        {
          placeholder: "{year}",
          description: "Returns the current year",
          formatter: () => new Date().getFullYear().toString(),
        },
        {
          placeholder: "{month}",
          description: "Returns the current month name",
          formatter: () => new Date().toLocaleDateString('en-US', { month: 'long' }),
        },
        {
          placeholder: "{day}",
          description: "Returns the current day of the month",
          formatter: () => new Date().getDate().toString(),
        },
      ],

      utility: [
        {
          placeholder: "{random}",
          description: "Returns a random number between 0-100",
          formatter: () => Math.floor(Math.random() * 101).toString(),
        },
        {
          placeholder: "{newline}",
          description: "Inserts a new line",
          formatter: () => "\n",
        },
        {
          placeholder: "{space}",
          description: "Inserts a space",
          formatter: () => " ",
        },
        {
          placeholder: "{prefix}",
          description: `Inserts TheophilusX's secondary prefix ${config.command.secondaryPrefix}`,
          formatter: () => config.command.secondaryPrefix
        }
      ],
    };

    // Flatten the object structure and register all placeholders
    for (const [category, placeholders] of Object.entries(DEFAULT_VARIABLE_PLACEHOLDERS)) {
      this.categorizedPlaceholders[category] = placeholders;

      for (const placeholder of placeholders) {
        this.placeholders.set(
          placeholder.placeholder,
          {
            description: placeholder.description,
            formatter: placeholder.formatter,
          }
        );
      }
    }
  }
}
