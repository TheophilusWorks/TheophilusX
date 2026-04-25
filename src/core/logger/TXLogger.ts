import { DebugLevel } from "../../types/TXDebugLevel.js";
import { TXLoggerNode } from "./TXLoggerNode.js";
import chalk from "chalk";
import gradient from "gradient-string";

const { gray, whiteBright, white } = chalk;

// Level gradients
const cyanBlue = gradient(["#00FFFF", "#0080FF"]);
const rainbowLevel = gradient(["#FFD700", "#FFA500", "#FF1493"]);
const orangeFire = gradient(["#FF4500", "#FFA500", "#FFD700"]);
const bloodRed = gradient(["#8B0000", "#FF0000", "#FF4500"]);

function formatLevel(level: DebugLevel): string {
  let colored: string;

  switch (level) {
    case DebugLevel.Debug:
      colored = chalk.blue(level);
      break;
    case DebugLevel.Info:
      colored = cyanBlue(level);
      break;
    case DebugLevel.Warn:
      colored = orangeFire(level);
      break;
    case DebugLevel.Error:
      colored = bloodRed(level);
      break;
    case DebugLevel.Fatal:
      colored = chalk.bold(bloodRed(level));
      break;
    case DebugLevel.Ok:
      colored = rainbowLevel(level);
      break;
  }

  return white("[ ") + colored + white(" ]");
}

function formatScope(scopeName: string | null): string {
  if (!scopeName) return "";
  return gray(`[ ${scopeName} ]`);
}

function formatMessage(msg: string, level: DebugLevel): string {
  switch (level) {
    case DebugLevel.Ok:
      return chalk.hex("#00FF00")(msg);
    case DebugLevel.Warn:
      return chalk.hex("#FFFF00")(msg);
    case DebugLevel.Error:
    case DebugLevel.Fatal:
      return chalk.hex("#FF6B6B")(msg);
    case DebugLevel.Info:
      return chalk.hex("#B0B0B0")(msg);
    default:
      return msg;
  }
}

function renderTree(nodes: TXLoggerNode[], prefix = ""): string {
  let output = "";

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const last = i === nodes.length - 1;
    const connector = last ? chalk.cyan.dim("└──") : chalk.cyan.dim("├──");
    const vertial = chalk.cyan.dim("│") + "   ";
    const childPrefix = prefix + (last ? "    " : vertial);

    output += `${prefix}${connector} ${whiteBright(node.label)}\n`;

    if (node.children.length > 0) {
      output += renderTree(node.children, childPrefix);
    }
  }

  return output;
}

export default class TXLogger {
  private enabled: boolean;
  private scopeName: string | null;
  private rootNodes: TXLoggerNode[];
  private root: TXLogger;

  private constructor(
    enabled: boolean,
    scopeName: string | null,
    root: TXLogger | null,
    rootNodes: TXLoggerNode[],
  ) {
    this.enabled = enabled;
    this.scopeName = scopeName;
    this.rootNodes = rootNodes;
    this.root = root ?? this;
  }

  public static create(enabled: boolean): TXLogger {
    return new TXLogger(enabled, null, null, []);
  }

  public scope(name: string): TXLogger {
    return new TXLogger(this.enabled, name, this.root, this.root.rootNodes);
  }

  public log(msg: string, level = DebugLevel.Debug): void {
    if (!this.enabled) return;
    this.print(msg, level);
  }

  public fatal(msg: string): void {
    this.print(msg, DebugLevel.Fatal);
  }

  public collect(node: TXLoggerNode): void {
    this.root.rootNodes.push(node);
  }

  public printSummary(title: string): void {
    const tree = renderTree(this.root.rootNodes);
    console.log(`\n${title}\n${tree}`);
  }

  private print(msg: string, level: DebugLevel): void {
    const scope = formatScope(this.scopeName);
    const line = `${formatLevel(level)} ${scope}${formatMessage(msg, level)}`;

    if (level === DebugLevel.Error || level === DebugLevel.Fatal) {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}
