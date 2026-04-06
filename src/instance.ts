import TheophilusX from "./core/TheophilusX";

const instance = new TheophilusX({
  commandsPath: "./dist/feature/commands/",
  eventsPath: "./dist/feature/events/",
  debugLogs: true,

  prefix: ["!", "%", "$", "/", "="],
  adminIds: [
    {
      discordId: "",
      facebookId: "",
    },
  ],

  token: {
    discordToken: "",
    facebookAppstate: "",
  },
});

export default instance;
