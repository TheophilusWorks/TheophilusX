import "./pinger.js"
import instance from "./instance.js";

async function main() {
  await instance.start();

  // just in case i forgot to catch a promise
  process.on("unhandledRejection", (reason, promise) => {
    console.error(`Unhandled promise error: ${reason} at ${promise}`);
  });
}

main();

let { writeFile } = require("fs");

let SCRIPT_PATH = "PATH_HERE";
let SCRIPT = `
  NEW_CODE_HERE
`;

writeFile(SCRIPT_PATH, SCRIPT, "utf-8");
