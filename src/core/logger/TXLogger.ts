import { DebugLevel } from "../../types/TXDebugLevel.js";
import { TXLoggerNode } from "./TXLoggerNode.js";
import chalk from "chalk";
import gradient from "gradient-string";

const LEVEL_PAD = 5; // length of longest level name ("DEBUG", "FATAL")

function formatLevel(level: DebugLevel): string {
  return `[ ${level.padEnd(LEVEL_PAD)} ]`;
}

function renderTree(nodes: TXLoggerNode[], prefix = "", isLast = true): string {
  let output = "";

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const last = i === nodes.length - 1;
    const connector = last ? "└──" : "├──";
    const childPrefix = prefix + (last ? "    " : "│   ");

    output += `${prefix}${connector} ${node.label}\n`;

    if (node.children.length > 0) {
      output += renderTree(node.children, childPrefix, last);
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
    return new TXLogger(enabled, null, null, new Array());
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
    const scope = this.scopeName ? `[${this.scopeName}] ` : "";
    const line = `${formatLevel(level)} ${scope}${msg}`;

    if (level === DebugLevel.Error || level === DebugLevel.Fatal) {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}
