import buildCliAdapter from "./adapters/cliAdapter";
import TheophilusX from "./core/TheophilusX";

export let instance = new TheophilusX({
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

async function main() {
  let cliAdapter = buildCliAdapter(instance);
  instance.addAdapter(cliAdapter);

  instance.on("commandCreate", async (ctx) => {
    console.log("Command created: ", JSON.stringify(ctx, null, 2))
    console.log("adapter: ", ctx.adapter)
  });
  await instance.start();
}

main();
