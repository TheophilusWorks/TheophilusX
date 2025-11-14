import { EmbedBuilder } from "discord.js";
import TXVariable from "../structures/TXVariables";
import { TXVariableParserContext } from "../typings/Variables";

const txVariable = new TXVariable();

export default async function buildEmbed(
  embedConfig: any,
  context: TXVariableParserContext
): Promise<EmbedBuilder> {

  // Convert Mongoose document to plain object first
  const plainConfig = embedConfig.toObject ? embedConfig.toObject() : embedConfig;

  const parseValue = async (value: any): Promise<any> => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return await txVariable.parse(value, context);
    if (Array.isArray(value)) {
      return await Promise.all(value.map(v => parseValue(v)));
    }
    if (typeof value === "object") {
      const obj: any = {};
      for (const [k, v] of Object.entries(value)) {
        // Skip Mongoose internal properties
        if (k === '_id' || k === '__v' || k === '$__' || k === '$isNew') continue;
        obj[k] = await parseValue(v);
      }
      return obj;
    }
    return value;
  };

  const parsed = await parseValue(plainConfig);

  const embed = new EmbedBuilder()
    .setTitle(parsed.title || null)
    .setDescription(parsed.description || null)
    .setColor(parsed.color || "#5865F2")
    .setURL(parsed.url || null)
    .setThumbnail(parsed.thumbnail || null)
    .setImage(parsed.image || null);

  if (parsed.footer) {
    embed.setFooter({ 
      text: parsed.footer, 
      iconURL: parsed.footerIconURL || undefined 
    });
  }

  if (parsed.author?.name) {
    embed.setAuthor({
      name: parsed.author.name,
      iconURL: parsed.author.iconURL || undefined,
      url: parsed.author.url || undefined,
    });
  }

  if (parsed.timestamp) embed.setTimestamp(new Date());

  return embed;
}
