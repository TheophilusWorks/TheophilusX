import "dotenv/config";
import TheophilusX from "./core/TheophilusX.js";

const instance = new TheophilusX({
  // Where commands and events are located.
  // TheophilusX will automatically load all .js files in these
  // directories.
  commandsPath: "./dist/feature/commands/",
  adminCommandsPath: "./dist/feature/adminCommands/",
  eventsPath: "./dist/feature/events/",
  debugLogs: true,

  // The prefix(es) that will trigger commands.
  // Can be a string or an array of strings.
  prefix: ["!", "%", "#", "/", "="],

  // The admin prefix will trigger admin-only commwnds.
  // Can be a string or an array
  adminPrefix: ["$", ">", "admin"],

  // Platforms to enable.
  // Set to false to disable a platform.
  // NOTE: you need to provide the appropriate tokens for each platform you enable
  // inside the .env file for the bot to work.
  // if you enable a platform but do not provide the necessary tokens,
  // the bot will not work on that platform.
  platforms: {
    cli: true,
    discord: true,
    facebookMessenger: false,
  },

  // Admin IDs for each platform.
  // these users will have access to admin-only commands.
  adminIds: [
    {
      discordId: "1264839050427367570",
      facebookId: "",
    },
  ],

  // WARN: DO NOT TOUCH THIS PART! dotenv already injects your tokens
  // as long as you have a .env file with the appropriate variables,
  // If you change this, your tokens will not be loaded and your bot will not work.
  token: {
    discordToken: process.env.DISCORD_TOKEN || "",
    facebookAppstate: "",
  },

  mongoDbURI: process.env.MONGODB_URI || ""
});

export default instance;
