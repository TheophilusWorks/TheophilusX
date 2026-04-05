import buildCliAdapter from "./adapters/cliAdapter";
import TheophilusX from "./core/TheophilusX";

async function main() {
  let instance = new TheophilusX({
    commandsPath: "./feature/commands",
    eventsPath: "./feature/events",
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

  let cliAdapter = buildCliAdapter(instance);
  instance.addAdapter(cliAdapter);
  await instance.start()
}

main();
