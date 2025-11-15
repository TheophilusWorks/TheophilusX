import { GuildInteraction } from "../typings/Command";

export default async function safeInteractionReply(
  interaction: GuildInteraction,
  message: any
) {
  if (interaction.replied) {
    return await interaction.followUp(message);
  }

  if (interaction.deferred) {
    return await interaction.editReply(message);
  }

  return await interaction.reply(message);
}
