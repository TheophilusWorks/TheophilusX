import { TXAdapter } from "../adapters/TXAdapterBuilder";
import TXContextBuilder from "./TXContextBuilder";

export interface TXCommandArgument {
  args: string[];
  ctx: TXContextBuilder;
  adapter: TXAdapter;

  stringValueFlags: Record<string, string>;
  boolValueFlags: Record<string, boolean>;

  getStringFlag: (flag: string) => string;
  getBoolFlag: (flag: string) => boolean;
}

export default class TXCommandArgumentBuilder {
  private cmdArgs: TXCommandArgument;
  constructor(ctx: TXContextBuilder, adapter: TXAdapter) {
    this.cmdArgs = {
      args: [],
      ctx: ctx,
      adapter,

      stringValueFlags: {},
      boolValueFlags: {},

      getStringFlag(flag: string) {
        const value = this.stringValueFlags[flag];
        return value === undefined || null ? "" : value;
      },
      getBoolFlag(flag: string) {
        const value = this.boolValueFlags[flag];
        return value === undefined || null ? false : value;
      },
    };
  }

  public setArgs(args: string[]) {
    this.cmdArgs.args = args;
    return this;
  }
  public setStringValueFlags(flags: Record<string, string>) {
    this.cmdArgs.stringValueFlags = flags;
    return this;
  }
  public setBoolValueFlags(flags: Record<string, boolean>) {
    this.cmdArgs.boolValueFlags = flags;
    return this;
  }
  public build() {
    return this.cmdArgs;
  }
}
