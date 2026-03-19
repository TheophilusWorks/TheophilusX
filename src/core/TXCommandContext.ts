export interface TXICommandContext {
  name: string;
  args: string[];

  stringValueFlags: Record<string, string>;
  boolValueFlags: Record<string, boolean>;

  getStringFlag: (flag: string) => string;
  getBoolFlag: (flag: string) => boolean;
}

export default class TXCommandContextBuilder {
  private commandContext: TXICommandContext;

  constructor() {
    this.commandContext = TXCommandContextBuilder.default();
  }

  static default(): TXICommandContext {
    return {
      name: "",
      args: [],

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

  public setName(name: string) {
    this.commandContext.name = name;
    return this;
  }

  public addArgs(args: string) {
    this.commandContext.args.push(args);
    return this;
  }

  public addStringFlag(key: string, value: string) {
    this.commandContext.stringValueFlags[key] = value;
    return this;
  }

  public addBoolFlag(key: string, value: boolean) {
    this.commandContext.boolValueFlags[key] = value;
    return this;
  }

  public build() {
    return this.commandContext;
  }
}
