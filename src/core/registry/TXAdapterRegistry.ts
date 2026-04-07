import TXAdapterBuilder from "../adapter/TXAdapterBuilder.js";
import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";
import { DebugLevel } from "../../types/TXDebugLevel.js";
import { TXPlatform } from "../context/TXContext.js";

export default class TXAdapterRegistry {
  private adapters: TXAdapterBuilder[];
  private logger: TXLogger;

  public usedPlatforms: TXPlatform[] = [];

  constructor(logger: TXLogger) {
    this.logger = logger.scope("AdapterRegistry");
    this.adapters = new Array();
  }

  public add(adapter: TXAdapterBuilder, platform: TXPlatform): void {
    this.adapters.push(adapter);
    this.usedPlatforms.push(platform);
    this.logger.log(`${platform} adapter registered`, DebugLevel.Ok);
  }

  public check(): void {
    if (this.adapters.length === 0) {
      throw new Error(
        "No adapters registered. Enable at least one platform in config or call add().",
      );
    }
    this.logger.log(
      `${this.adapters.length} adapter(s) registered`,
      DebugLevel.Ok,
    );
  }

  public async login(): Promise<void> {
    for (const adapter of this.adapters) {
      await adapter.login();
    }
  }

  public toSummaryNode(): TXLoggerNode {
    return {
      label: `Adapters (${this.adapters.length})`,
      children: this.usedPlatforms.map((p) => ({
        label: p,
        children: [],
      })),
    };
  }
}
