import "dotenv/config";
import TheophilusX from "./core/TheophilusX.js";
import os from "os";
import path from "path";

const instance = new TheophilusX({
  // Where commands and events are located.
  // TheophilusX will automatically load all .js files in these
  // directories.
  commandsPath: "./dist/feature/commands/",
  adminCommandsPath: "./dist/feature/adminCommands/",
  eventsPath: "./dist/feature/events/",
  timedEventsPath: "./dist/feature/timedEvents/",
  itemsPath: "./json/shop-items.json",
  crateItemsPath: "./json/crate-items.json",
  cachePath: path.resolve(os.tmpdir(), "tx-state.json"),
  debugLogs: true,

  // The prefix(es) that will trigger commands.
  // Can be a string or an array of strings.
  prefix: ["!", "%", "#", "/", "="],

  // The admin prefix will trigger admin-only commwnds.
  // Can be a string or an array
  adminPrefix: ["$", ">", "~"],

  // Platforms to enable.
  // Set to false to disable a platform.
  // NOTE: you need to provide the appropriate tokens for each platform you enable
  // inside the .env file for the bot to work.
  // if you enable a platform but do not provide the necessary tokens,
  // the bot will not work on that platform.
  platforms: {
    cli: true,
    discord: true,
    facebookMessenger: true,
  },

  // NOTE: Facebook-only option
  // Sends a message to the group logger every 10 minutes
  // when theres no requests/response being sent to avoid
  // inactivity related errors
  groupLogger: {
    enabled: true,
    facebookGroupId: "9522558064445812",
  },

  // Admin IDs for each platform.
  // these users will have access to admin-only commands.
  adminIds: [
    {
      discordId: "1264839050427367570",
      facebookId: "61555836246766",
    },
    {
      facebookId: "61552922702107",
    },
  ],

  // WARN: DO NOT TOUCH THIS PART! dotenv already injects your tokens
  // as long as you have a .env file with the appropriate variables,
  // If you change this, your tokens will not be loaded and your bot will not work.
  token: {
    discordToken: process.env.DISCORD_TOKEN || "",
    facebookAppstate: process.env.FACEBOOK_APPSTATE || "",
  },

  mongoDbURI: process.env.MONGODB_URI || "",
});

export default instance;
