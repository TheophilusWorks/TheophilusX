/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextChannel,
  NewsChannel,
  ThreadChannel,
} from "discord.js";
import TXCommand from "../../../structures/TXCommand";
import { GuildMessage } from "../../../typings/Command";

type SendableChannel = TextChannel | NewsChannel | ThreadChannel;

interface JokeResponse {
  error: boolean;
  category: string;
  type: "single" | "twopart";
  joke?: string;
  setup?: string;
  delivery?: string;
  flags: {
    nsfw: boolean;
    religious: boolean;
    political: boolean;
    racist: boolean;
    sexist: boolean;
    explicit: boolean;
  };
  id: number;
  safe: boolean;
  lang: string;
  additionalInfo?: string;
}

export default new TXCommand({
  name: "joke",
  description: "Sends a random joke",
  syntax: "joke",
  cooldown: 5000,
  execute: async ({ message }: { message: GuildMessage }) => {
    try {
      const joke = await fetchJoke();

      if (!joke.safe) {
        const proceed = await promptUserForUnsafeContent(message, joke);
        if (!proceed) return;
      }

      const baseEmbed = createBaseEmbed(message);

      if (joke.type === "twopart" && joke.setup && joke.delivery) {
        await handleTwoPartJoke(message, joke, baseEmbed);
      } else if (joke.type === "single" && joke.joke) {
        baseEmbed
          .setTitle(`Category: ${joke.category}`)
          .setDescription(joke.joke);
        await message.reply({ embeds: [baseEmbed] });
      }
    } catch (err) {
      await handleError(message, err);
    }
  },
});

async function fetchJoke(): Promise<JokeResponse> {
  const response = await fetch("https://v2.jokeapi.dev/joke/Any");
  
  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }

  const data: JokeResponse = await response.json();

  if (data.error) {
    throw new Error(data.additionalInfo || "Unknown API error");
  }

  return data;
}

function createBaseEmbed(message: GuildMessage): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("Blurple")
    .setFooter({
      text: `Requested by ${message.author.displayName}`,
      iconURL: message.author.displayAvatarURL(),
    });
}

function getFlagsList(flags: JokeResponse["flags"]): string[] {
  return Object.entries(flags)
    .filter(([_, isActive]) => isActive)
    .map(([flag]) => flag);
}

async function promptUserForUnsafeContent(
  message: GuildMessage,
  joke: JokeResponse
): Promise<boolean> {
  const flags = getFlagsList(joke.flags);

  const description = flags.length > 0
    ? `This joke is flagged as **[${flags.join(", ")}]**.\nDo you wish to continue?`
    : `This joke has **no specific flags**, but is still marked as **unsafe**.\nDo you wish to continue?`;

  const embed = new EmbedBuilder()
    .setColor("DarkButNotBlack")
    .setTitle("⚠️ Content Warning")
    .setDescription(description);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("joke-exit")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("joke-continue")
      .setLabel("Show Joke")
      .setStyle(ButtonStyle.Primary)
  );

  const reply = await message.reply({
    embeds: [embed],
    components: [row],
  });

  return new Promise((resolve) => {
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      max: 1,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription("This prompt is not for you."),
          ],
          ephemeral: true,
        });
        return;
      }

      const continued = interaction.customId === "joke-continue";

      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(continued ? "Green" : "Red")
            .setDescription(
              continued
                ? "Loading joke..."
                : "Joke cancelled."
            ),
        ],
        components: [],
      });

      resolve(continued);
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        reply.edit({ components: [] }).catch(() => {});
        resolve(false);
      }
    });
  });
}

async function handleTwoPartJoke(
  message: GuildMessage,
  joke: JokeResponse,
  baseEmbed: EmbedBuilder
): Promise<void> {
  if (!joke.setup || !joke.delivery) return;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("joke-reveal")
      .setLabel("Show Punchline")
      .setStyle(ButtonStyle.Primary)
  );

  const setupEmbed = new EmbedBuilder(baseEmbed.toJSON())
    .setTitle(`Category: ${joke.category}`)
    .setDescription(joke.setup);

  const reply = await message.reply({
    embeds: [setupEmbed],
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("This joke is not for you."),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const punchlineEmbed = new EmbedBuilder(baseEmbed.toJSON())
      .setDescription(`||${joke.delivery}||`)
      .setTitle("🎭 Punchline");

    await reply.edit({
      embeds: [setupEmbed, punchlineEmbed],
      components: [],
    });
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      reply.edit({ components: [] }).catch(() => {});
    }
  });
}

async function handleError(message: GuildMessage, err: unknown): Promise<void> {
  const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";

  const errorEmbed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("Error")
    .setDescription(`\`\`\`${errorMessage}\`\`\``)
    .setFooter({ text: "Please try again later" });

  await message.reply({ embeds: [errorEmbed] }).catch(() => {});
}
