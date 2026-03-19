import { Client, GatewayIntentBits, Options, Partials } from "discord.js";

export default class TXClient {
  static async createDiscord(token: string): Promise<Client> {
    console.log("Instantiating discord client")
    let client = new Client({
      // enable every intent
      intents: Object.values(GatewayIntentBits).filter(
        (v) => typeof v === "number",
      ) as GatewayIntentBits[],

      // enable every partial
      partials: Object.values(Partials).filter(
        (v) => typeof v === "number",
      ) as Partials[],

      allowedMentions: {
        parse: ["users", "roles", "everyone"],
        repliedUser: true,
      },

      failIfNotExists: false,

      // cache limits
      makeCache: Options.cacheWithLimits({
        GuildMemberManager: 200,
        UserManager: 200,
        MessageManager: 500,
      }),

      // sweepers for memory cleanup
      sweepers: {
        messages: { interval: 3600, lifetime: 1800 },
      },
    });

    console.log("Logging discord client in")
    await client.login(token);
    console.log("Discord client logged in")
    return client;
  }

  static createCLI() {
    return { send: console.log };
  }
}
