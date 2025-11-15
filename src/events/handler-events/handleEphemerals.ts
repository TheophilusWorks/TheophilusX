// messageReactionAdd.ts
/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import {
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
} from "discord.js";
import { TXEvent } from "../../structures/TXEvent";
import config from "../../../txconfig.json";

export default new TXEvent(
  "messageReactionAdd",
  async (
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ) => {
    if (user.bot) return;
    if (reaction.emoji.name !== config.misc.ephemeralEmoji) return;

    try {
      if (reaction.partial) {
        await reaction.fetch();
      }
      if (reaction.message.partial) {
        await reaction.message.fetch();
      }
      if (user.partial) {
        await user.fetch();
      }
    } catch (error) {
      console.error("Failed to fetch partial data:", error);
      return;
    }

    const message = reaction.message;

    const trashReaction = message.reactions.cache.get(
      config.misc.ephemeralEmoji,
    );
    if (!trashReaction) return;

    try {
      await trashReaction.users.fetch();
    } catch (error) {
      console.error("Failed to fetch reaction users:", error);
      return;
    }

    const botReacted = trashReaction.users.cache.has(
      message.client.user?.id || "",
    );
    if (!botReacted) return;

    let authorId = message.author?.id;

    if (message.reference?.messageId) {
      try {
        const referenced = await message.channel.messages.fetch(
          message.reference.messageId,
        );
        authorId = referenced.author.id;
      } catch {}
    }

    if (user.id !== authorId) return;

    try {
      await message.delete();
    } catch (error) {}
  },
);
