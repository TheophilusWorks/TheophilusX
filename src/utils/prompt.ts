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

  rl.close();
  return ans;
}

export async function continue_prompt(
  message = "Press Enter to continue...",
): Promise<void> {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  let input = "not_enter";

  while (input !== "") {
    input = await rl.question(message);
    console.log() //empty new line
  }

  rl.close();
}
