import { stdin, stdout } from "process";
import readline from "readline/promises";

export async function ask(question: string): Promise<string> {
  let ans = "";
  let rl = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  while (!ans) {
    ans = await rl.question(question);
  }

  return ans;
}
