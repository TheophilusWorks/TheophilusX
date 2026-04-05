import TXICommandArgument from "../../../types/TXICommandArgument";

const TRUTHY = new Set(["true", "t", "y", "yes"]);
const FALSY = new Set(["false", "f", "n", "no"]);

export default class TXCommandArgumentParser {
  private commandString: string;

  constructor(commandString: string) {
    this.commandString = commandString;
  }

  public parse(): TXICommandArgument {
    const stripped = this.stripPrefix(this.commandString);
    const tokens = this.tokenize(stripped);

    if (tokens.length === 0) {
      return { command: "", arguments: [], booleanFlags: {}, stringFlags: {} };
    }

    const command = tokens[0];
    const args: string[] = [];
    const booleanFlags: Record<string, boolean> = {};
    const stringFlags: Record<string, string> = {};

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.startsWith("--")) {
        const inner = token.slice(2);

        // bare "--" is invalid
        if (inner.length === 0) {
          throw new Error(`Invalid flag: "--" alone is not allowed`);
        }

        const eqIndex = inner.indexOf("=");

        if (eqIndex === -1) {
          // --silent = implicit true
          if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(inner)) {
            throw new Error(`Invalid flag name: "--${inner}"`);
          }
          booleanFlags[inner] = true;
        } else {
          const key = inner.slice(0, eqIndex);
          const value = inner.slice(eqIndex + 1);

          // --=value is invalid
          if (key.length === 0) {
            throw new Error(`Invalid flag syntax: "--${inner}" has no key`);
          }

          // --key= with no value is invalid
          if (value.length === 0) {
            throw new Error(`Invalid flag syntax: "--${key}=" has no value`);
          }

          if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(key)) {
            throw new Error(`Invalid flag name: "--${key}"`);
          }

          if (TRUTHY.has(value.toLowerCase())) {
            booleanFlags[key] = true;
          } else if (FALSY.has(value.toLowerCase())) {
            booleanFlags[key] = false;
          } else {
            stringFlags[key] = value;
          }
        }
      } else {
        args.push(token);
      }
    }

    return { command, arguments: args, booleanFlags, stringFlags };
  }

  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuote = false;
    let quoteChar = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      // handle escape sequences inside quotes
      if (inQuote && char === "\\" && i + 1 < input.length) {
        const next = input[i + 1];
        if (next === quoteChar || next === "\\") {
          current += next;
          i++; // skip next char
          continue;
        }
      }

      // opening quote
      if (!inQuote && (char === '"' || char === "'")) {
        inQuote = true;
        quoteChar = char;
        continue;
      }

      // closing quote
      if (inQuote && char === quoteChar) {
        inQuote = false;
        quoteChar = "";
        continue;
      }

      // whitespace outside quotes = token boundary
      if (!inQuote && /\s/.test(char)) {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }
        continue;
      }

      current += char;
    }

    // unterminated quote
    if (inQuote) {
      throw new Error(`Unterminated quote in command string`);
    }

    if (current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }

  private stripPrefix(input: string): string {
    return input.replace(/^[^a-zA-Z0-9]+/, "");
  }
}
