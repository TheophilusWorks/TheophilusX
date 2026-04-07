import TXICommandArgument from "../../../types/TXICommandArgument.js";
import TXAdapterBuilder from "../../adapter/TXAdapterBuilder.js";
import { TXIContext } from "../../context/TXContext.js";

const TRUTHY = new Set(["true", "t", "y", "yes"]);
const FALSY = new Set(["false", "f", "n", "no"]);

export default class TXCommandArgumentParser {
  private static readonly MAX_DEPTH = 5;

  private commandString: string;
  private tokens: Array<string>;
  private currentTokenIdx: number = 0;
  private depth: number;

  private adapter: TXAdapterBuilder;
  private context: TXIContext;

  private name: string = "";
  private args: Array<string> = new Array();
  private groupedArgs: Array<TXICommandArgument> = new Array();
  private stringFlags: Record<string, string> = {};
  private booleanFlags: Record<string, boolean> = {};

  constructor(
    prefixUsed: string,
    commandString: string,
    adapter: TXAdapterBuilder,
    depth: number = 0,
    context: TXIContext,
  ) {
    this.commandString = commandString.slice(prefixUsed.length).trim();
    this.adapter = adapter;
    this.tokens = this.tokenize();
    this.depth = depth;
    this.context = context
  }

  public parse(): TXICommandArgument {
    while (this.currentTokenIdx < this.tokens.length) {
      let token = this.currentToken();

      if (this.currentTokenIdx == 0) {
        this.name = this.advance();
        continue;
      }

      if (token === "[") {
        this.parseGroupedArgs();
        continue;
      }

      if (token.startsWith("--")) {
        this.parseFlags(token);
      } else {
        this.args.push(token);
      }

      this.advance();
    }

    return {
      command: this.name,
      args: this.args,
      groupedArgs: this.groupedArgs,
      adapter: this.adapter,
      stringFlags: this.stringFlags,
      booleanFlags: this.booleanFlags,
      context: this.context,
    };
  }

  private parseGroupedArgs() {
    this.advance(); // consume "["
    let current = "";
    let depth = 1;

    while (this.currentTokenIdx < this.tokens.length) {
      const token = this.currentToken();

      if (token === "[") {
        depth++;
        current += (current.length > 0 ? " " : "") + token;
        this.advance();
        continue;
      }

      if (token === "]") {
        depth--;
        if (depth === 0) {
          if (current.trim().length > 0) {
            this.pushGroupedArg(current.trim());
          }
          this.advance(); // consume closing "]"
          return;
        }
        current += (current.length > 0 ? " " : "") + token;
        this.advance();
        continue;
      }

      if (token === "," && depth === 1) {
        if (current.trim().length > 0) {
          this.pushGroupedArg(current.trim());
          current = "";
        }
        this.advance();
        continue;
      }

      if (token === "[" || token === "]" || token === ",") {
        current += token;
      } else {
        current += (current.length > 0 ? " " : "") + token;
      }

      this.advance();
    }

    // unterminated bracket
    if (current.trim().length > 0) {
      this.pushGroupedArg(current.trim());
    }
  }

  private pushGroupedArg(raw: string) {
    if (this.depth >= TXCommandArgumentParser.MAX_DEPTH) return;
    this.groupedArgs.push(
      new TXCommandArgumentParser(
        "",
        raw,
        this.adapter,
        this.depth + 1,
        this.context
      ).parse(),
    );
  }

  private parseFlags(token: string) {
    token = token.slice(2); // remove leading --

    // non-valued flag (e.g. --silent)
    if (!token.includes("=")) {
      this.booleanFlags[token] = true;
      return;
    }

    // double "=" or missing key/value (e.g. --=foo, --key=, --a=b=c)
    if (token.split("=").length - 1 !== 1) {
      this.recover();
      return;
    }

    let [key, value] = token.split("=");

    // empty key or empty value
    if (key.length === 0 || value.length === 0) {
      this.recover();
      return;
    }

    if (TRUTHY.has(value.toLowerCase())) {
      this.booleanFlags[key] = true;
    } else if (FALSY.has(value.toLowerCase())) {
      this.booleanFlags[key] = false;
    } else {
      this.stringFlags[key] = value;
    }
  }

  private tokenize(): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuote = false;
    let quoteChar = "";

    for (let i = 0; i < this.commandString.length; i++) {
      const char = this.commandString[i];

      // escape sequences inside quotes
      if (inQuote && char === "\\" && i + 1 < this.commandString.length) {
        const next = this.commandString[i + 1];
        if (next === quoteChar || next === "\\") {
          current += next;
          i++;
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

      // bracket and comma delimiters
      if (!inQuote && (char === "[" || char === "]" || char === ",")) {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }
        tokens.push(char);
        continue;
      }

      current += char;
    }

    // unterminated quote, treat remainder as token
    if (current.length > 0) tokens.push(current);

    return tokens;
  }

  private advance() {
    return this.tokens[this.currentTokenIdx++];
  }

  private currentToken() {
    return this.tokens[this.currentTokenIdx];
  }

  private recover() {
    this.advance();
  }
}
