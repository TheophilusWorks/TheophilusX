import axios from "axios";
import TXCommand from "../../../core/command/TXCommand.js";
import TXAdapterBuilder from "../../../core/adapter/TXAdapterBuilder.js";
import { TXIContext } from "../../../core/context/TXContext.js";
import { capitalize } from "../../../utils/capitalize.js";

export default new TXCommand({
  name: "joke",
  description: "Sends a joke",
  usage: "joke {--list-categories, --category=<category>}",
  minimumArguments: 0,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  usedBooleanFlags: ["list-categories"],
  usedStringFlags: ["category"],
  execute: async ({ adapter, context, stringFlags, booleanFlags }) => {
    if (booleanFlags?.["list-categories"]) {
      await listCategories(adapter, context);
      return;
    }

    let category = stringFlags?.["category"]
      ? capitalize(stringFlags["category"])
      : "Any";

    let data = await getJoke(category);
    if (data.type == "single") await sendSingle(context, adapter, data);
    else await sendTwopart(context, adapter, data);
  },
});

async function listCategories(adapter: TXAdapterBuilder, context: TXIContext) {
  await adapter.reply(
    context,
    `
╭┈◦•◦❥•◦ Joke categories
╰┈➤ Christmas
╰┈➤ Dark
╰┈➤ Misc
╰┈➤ Programming
╰┈➤ Pun
╰┈➤ Spooky
`,
  );
}

async function getJoke(category = "Any") {
  let res = await axios.get(`https://v2.jokeapi.dev/joke/${category}`);
  if (res.status !== 200)
    throw new Error(`Cannot fetch joke. status: ${res.status}`);

  let data = res.data;
  if (data.error)
    throw new Error(
      "Unknown error occurred while trying to read the joke response",
    );
  return data;
}

async function sendSingle(
  context: TXIContext,
  adapter: TXAdapterBuilder,
  data: Record<string, unknown>,
) {
  await adapter.reply(
    context,
    formatIntro(
      data.category as string,
      data.type as string,
      data.joke as string,
      data.flags as Record<string, boolean>,
    ),
  );
}

async function sendTwopart(
  context: TXIContext,
  adapter: TXAdapterBuilder,
  data: Record<string, unknown>,
) {
  let msg = await adapter.reply(
    context,
    formatIntro(
      data.category as string,
      data.type as string,
      data.setup as string,
      data.flags as Record<string, boolean>,
    ),
  );

  let response = await msg.waitReply({
    timeout: 120_000, // 120s
    filter: (msg) => msg.author.id == context.author.id,
  });

  response?.reply(data.delivery as string);
}

function formatIntro(
  category: string,
  type: string,
  body: string,
  flags: Record<string, boolean>,
): string {
  let formattedFlags = Object.entries(flags)
    .filter(([_, bool]) => bool)
    .map(([flag]) => flag)
    .join(" | ");

  let intro = `
╭┈◦•◦❥•◦ ❝ [ ${category.toLowerCase()} ]
╰┈➤ ${type.toLowerCase()}

${body}`;

  if (formattedFlags.length > 0) {
    intro += `
\n﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌
Flags: ${formattedFlags}
`;
  }

  if (type == "twopart") {
    intro =
      intro.trim() +
      "\n\nReply to this with any message to continue the twopart joke";
  }

  return intro.trim();
}
