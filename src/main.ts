import buildCliAdapter from "./adapters/cliAdapter";
import instance from "./instance";

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
