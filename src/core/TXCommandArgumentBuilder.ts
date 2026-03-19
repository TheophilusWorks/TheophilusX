import TXContext from "./TXContext";

export interface TXCommandArgument {
  args: string[];
  ctx: TXContext;

  stringValueFlags: Record<string, string>;
  boolValueFlags: Record<string, boolean>;

  getStringFlag: (flag: string) => string;
  getBoolFlag: (flag: string) => boolean;
}

export default class TXCommandArgumentBuilder {
  private cmdArgs: TXCommandArgument;
  constructor(ctx: TXContext) {
    this.cmdArgs = {
      args: [],
      ctx: ctx,

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
