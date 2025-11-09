/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import chalk from "chalk";
import gradient from "gradient-string";

export enum LogLevel {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARN = "WARN",
  ERROR = "ERROR"
}

export enum LogTag {
  CORE = "CORE",
  COMMANDS = "COMMANDS",
  EVENTS = "EVENTS",
  DATABASE = "DATABASE",
  NETWORK = "NETWORK",
  LOGIN = "LOGIN",
  OTHER = "OTHER",
  READY = "READY",
  WEB = "WEB"
}

interface LogOptions {
  message: string;
  tag?: LogTag;
  extra?: any[];
}

export class PrettyLogger {
  private static format(
    level: LogLevel,
    levelColor: (text: string) => string,
    message: string,
    messageColor: (text: string) => string,
    tag?: LogTag
  ) {
    const time = new Date().toLocaleTimeString();
    const base = chalk.gray(`[${time}]`);
    const levelText = chalk.white(`[`) + levelColor(` ${level} `) + chalk.white(`]`);
    const tagText = tag ? chalk.white(`[ ${tag} ]`) : "";

    // color only the message
    const coloredMessage = message
      .split("\n")
      .map(line => messageColor(line))
      .join("\n");

    console.log(`${base} ${levelText} ${tagText} ${coloredMessage}`);
  }

  static info({ message, tag, extra }: LogOptions) {
    const cyanBlue = gradient(["#00FFFF", "#0080FF"]);
    this.format(
      LogLevel.INFO,
      cyanBlue,
      message,
      chalk.hex("#B0B0B0"),
      tag
    );
    if (extra?.length) console.log(...extra);
  }

  static success({ message, tag, extra }: LogOptions) {
    const rainbow = gradient([
      "#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#8B00FF"
    ]);
    const rainbowLevel = gradient(["#FFD700", "#FFA500", "#FF1493"]);
    this.format(
      LogLevel.SUCCESS,
      rainbowLevel,
      message,
      rainbow,
      tag
    );
    if (extra?.length) console.log(...extra);
  }

  static warn({ message, tag, extra }: LogOptions) {
    const orangeFire = gradient(["#FF4500", "#FFA500", "#FFD700"]);
    this.format(
      LogLevel.WARN,
      orangeFire,
      message,
      chalk.hex("#FFFF00"),
      tag
    );
    if (extra?.length) console.log(...extra);
  }

  static error({ message, tag, extra }: LogOptions) {
    const bloodRed = gradient(["#8B0000", "#FF0000", "#FF4500"]);
    this.format(
      LogLevel.ERROR,
      bloodRed,
      message,
      chalk.hex("#FF6B6B"),
      tag
    );
    if (extra?.length) console.log(...extra);
  }
}
