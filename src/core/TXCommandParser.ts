import TXCommandContextBuilder from "./TXCommandContext";
import config from "../../config.json";

export default class TXCommandParser {
  private command: TXCommandContextBuilder;
  private currentTokenPtr: number;
  private tokens: string[];

  constructor(cmd: string) {
    this.command = new TXCommandContextBuilder();

    const raw = cmd.slice(config.prefix.default.length); // remove prefix
    this.tokens = this.tokenize(raw);

    this.currentTokenPtr = 0;
  }

  public parseCommandString() {
    while (this.currentTokenPtr < this.tokens.length) {
      if (this.currentTokenPtr === 0) {
        this.command.setName(this.currentToken());
        this.advance();
        continue;
      }

      this.parseToken(this.currentToken());
      this.advance();
    }

    return this.command.build();
  }

  private parseToken(token: string) {
    if (!token) return;

    switch (true) {
      case token.startsWith("--"):
        this.parseFlags(token);
        break;

      default:
        this.command.addArgs(token);
    }
  }

  private parseFlags(token: string) {
    const trimmedToken = token.slice(2);

    if (!trimmedToken.includes("=")) {
      this.command.addBoolFlag(trimmedToken, true);
      return;
    }

    const valuedToken = trimmedToken.split("=");

    if (valuedToken.length > 2) {
      this.recover();
      return;
    }

    const [key, value] = valuedToken;
    const lowVal = value.toLowerCase();

    const truthySet = new Set(config.command.flags.boolValueFlags.truthy);
    const falsySet = new Set(config.command.flags.boolValueFlags.falsy);

    if (truthySet.has(lowVal)) {
      this.command.addBoolFlag(key, true);
    } else if (falsySet.has(lowVal)) {
      this.command.addBoolFlag(key, false);
    } else {
      this.command.addStringFlag(key, value);
    }
  }

  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === " " && !inQuotes) {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }
        continue;
      }

      current += char;
    }

    if (current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }

  private recover() {
    this.advance();
  }

  private advance() {
    return this.tokens[this.currentTokenPtr++];
  }

  private currentToken() {
    return this.tokens[this.currentTokenPtr];
  }
}
