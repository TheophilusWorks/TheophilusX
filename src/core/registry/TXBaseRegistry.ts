import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";

export default class TXBaseRegistry {
  protected logger: TXLogger;
  constructor(logger: TXLogger) {
    this.logger = logger;
  }

  public async load(...args: any[]): Promise<void> {
    throw new Error("load() not set");
  }

  public async reloadModules(...args: any[]): Promise<void> {
    throw new Error("reloadModules() not set");
  }

  public toSummaryNode(): TXLoggerNode {
    throw new Error("toSummaryNode() not set");
  }
}
