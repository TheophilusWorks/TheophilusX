/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import {
  ApplicationCommandDataResolvable,
  Client,
  ClientEvents,
  Collection,
  GatewayIntentBits
} from "discord.js";
import { SlashCommandType, TXCommandType } from "../typings/Command";
import { PrettyLogger as log, LogTag } from "../utils/PrettyLogger";
import { glob } from "glob";
import { RegisterCommandOptions } from "../typings/Client";
import { TXEvent } from "./TXEvent";
import path = require("path");

export default class TheophilusX extends Client {
  public commands: Collection<string, SlashCommandType> = new Collection();
  public slashCommands: ApplicationCommandDataResolvable[]
  public txCommands: TXCommandType[]

  constructor() {
    super({
      intents: Object.values(GatewayIntentBits).filter(
          (v) => typeof v === "number"
      ) as GatewayIntentBits[],
    });

    this.slashCommands = [];
    this.txCommands = [];
  }

  public async instantiate() {
    log.info({
      message: "TheophilusX is instantiating...",
      tag: LogTag.CORE,
    });

    try {
      await this.registerModules();
      await this.loginTX(process.env.DISCORD_TOKEN);
    } catch (error) {
      log.error({
        message: "An error occured whilst instantiating",
        tag: LogTag.CORE,
        extra: [error],
      });
      process.exit(1);
    }
    log.success({
      message: "Instantiated TheophilusX",
      tag: LogTag.CORE,
    });
  }

  private async loginTX(discordToken: string) {
    try {
      log.info({
        message: "TheophilusX is attempting to login...",
        tag: LogTag.LOGIN,
      });
      await this.login(discordToken);
      log.success({
        message: "TheophilusX successfully logged in",
        tag: LogTag.LOGIN,
      });
    } catch (error) {
      log.error({
        message: "An error occured whilst attempting to login",
        tag: LogTag.LOGIN,
        extra: [error],
      });
      process.exit(1);
    }
  }

  private async importFile(filePath: string) {
    return (await import(filePath))?.default;
  }

  private areChoicesDifferent(
    existingChoices: any[],
    localChoices: any[],
  ): boolean {
    for (const localChoice of localChoices) {
      const existingChoice = existingChoices?.find(
        (choice) => choice.name === localChoice.name,
      );

      if (!existingChoice) {
        return true;
      }

      if (localChoice.value !== existingChoice.value) {
        return true;
      }
    }
    return false;
  }

  private areOptionsDifferent(
    existingOptions: any[],
    localOptions: any[],
  ): boolean {
    for (const localOption of localOptions) {
      const existingOption = existingOptions?.find(
        (option) => option.name === localOption.name,
      );

      if (!existingOption) {
        return true;
      }

      if (
        localOption.description !== existingOption.description ||
        localOption.type !== existingOption.type ||
        (localOption.required || false) !== existingOption.required ||
        (localOption.choices?.length || 0) !==
          (existingOption.choices?.length || 0) ||
        this.areChoicesDifferent(
          existingOption.choices || [],
          localOption.choices || [],
        )
      ) {
        return true;
      }
    }
    return false;
  }

  private areCommandsDifferent(
    existingCommand: any,
    localCommand: any,
  ): boolean {
    if (
      existingCommand.description !== localCommand.description ||
      existingCommand.options?.length !== (localCommand.options?.length || 0) ||
      this.areOptionsDifferent(
        existingCommand.options || [],
        localCommand.options || [],
      )
    ) {
      return true;
    }

    return false;
  }

  public async detectAndRemoveDuplicates(guildId?: string) {
    try {
      const applicationCommands = guildId
        ? this.guilds.cache.get(guildId)?.commands
        : this.application?.commands;

      if (!applicationCommands) {
        return;
      }

      await applicationCommands.fetch({});

      const commandNames = new Map<string, string[]>();

      for (const [id, cmd] of applicationCommands.cache) {
        if (!commandNames.has(cmd.name)) {
          commandNames.set(cmd.name, []);
        }
        commandNames.get(cmd.name)!.push(id);
      }

      let duplicatesFound = 0;
      for (const [name, ids] of commandNames) {
        if (ids.length > 1) {
          duplicatesFound++;
          log.warn({
            message: `Found ${ids.length} duplicate commands named "${name}"`,
            tag: LogTag.COMMANDS,
          });

          for (let i = 0; i < ids.length - 1; i++) {
            await applicationCommands.delete(ids[i]);
            log.info({
              message: `Deleted duplicate command "${name}"`,
              tag: LogTag.COMMANDS,
            });
          }
        }
      }

      if (duplicatesFound > 0) {
        const scope = guildId ? `guild ${guildId}` : "global";
        log.success({
          message: `Cleaned up ${duplicatesFound} duplicate command(s) in ${scope}`,
          tag: LogTag.COMMANDS,
        });
      }
    } catch (error) {
      log.error({
        message: `Failed to detect duplicates`,
        tag: LogTag.COMMANDS,
        extra: [error],
      });
    }
  }

  public async syncCommands({ commands, guildId }: RegisterCommandOptions) {
    try {
      const applicationCommands = guildId
        ? this.guilds.cache.get(guildId)?.commands
        : this.application?.commands;

      if (!applicationCommands) {
        log.error({
          message: `Could not get command manager for ${guildId ? `guild ${guildId}` : "global"}`,
          tag: LogTag.COMMANDS,
        });
        return;
      }

      await applicationCommands.fetch({});

      for (const localCommand of commands) {
        const { name, description, options } = localCommand as any;

        const existingCommand = applicationCommands.cache.find(
          (cmd) => cmd.name === name,
        );

        if (existingCommand) {
          if (this.areCommandsDifferent(existingCommand, localCommand)) {
            await applicationCommands.delete(existingCommand.id);
            await applicationCommands.create({
              name,
              description,
              options,
            });
            log.info({
              message: `Edited command "${name}"`,
              tag: LogTag.COMMANDS,
            });
          }
        } else {
          await applicationCommands.create({
            name,
            description,
            options,
          });
          log.info({
            message: `Registered command "${name}"`,
            tag: LogTag.COMMANDS,
          });
        }
      }

      for (const applicationCommand of applicationCommands.cache.values()) {
        const localCommand = commands.find(
          (cmd) => (cmd as any).name === applicationCommand.name,
        );

        if (!localCommand) {
          await applicationCommands.delete(applicationCommand.id);
          log.warn({
            message: `Unregistered command "${applicationCommand.name}" (not found locally)`,
            tag: LogTag.COMMANDS,
          });
        }
      }

      const scope = guildId ? `guild ${guildId}` : "GLOBAL";
      log.success({
        message: `Command sync complete for ${scope}`,
        tag: LogTag.COMMANDS,
      });
    } catch (error) {
      log.error({
        message: `Failed to sync commands for ${guildId ? `guild ${guildId}` : "global"}`,
        tag: LogTag.COMMANDS,
        extra: [error],
      });
    }
  }

  private async registerModules() {
    // slash-commands
    //
    const slashCommandFiles = await glob(`${__dirname}/../commands/slash-commands/*/*{.ts,.js}`);

    log.info({
      message: `Loading ${slashCommandFiles.length} slash-command file(s)...`,
      tag: LogTag.COMMANDS,
    });

    for (const commandFile of slashCommandFiles) {
      const command: SlashCommandType = await this.importFile(commandFile);
      if (!command?.name) continue;

      this.commands.set(command.name, command);
      this.slashCommands.push(command);
    }

    // tx-commands
    const txCommandFiles = await glob(`${__dirname}/../commands/tx-commands/*/*{.ts,.js}`)

    log.info({
      message: `Loading ${txCommandFiles.length} TX-command file(s)...`,
      tag: LogTag.COMMANDS
    })

    for(const commandFile of txCommandFiles) {
      const command: TXCommandType = await this.importFile(commandFile)
      if(!command?.name) continue

      const commandExist = this.txCommands.find((cmd) => cmd?.name === command.name)
      if(commandExist){
        log.warn({
          message: `Found a duplicated command "${command.name}", ignoring...`,
          tag: LogTag.COMMANDS
        })

        continue
      }

      this.txCommands.push(command)
    }

    // events

    const eventFiles = (await glob(`${__dirname}/../events/*{.ts,.js}`)).sort();

    log.info({
      message: `Loading ${eventFiles.length} event file(s)...`,
      tag: LogTag.EVENTS,
    });

    for (const eventFile of eventFiles) {
      const eventName = path.basename(eventFile).split(".")[0];
      const event: TXEvent<keyof ClientEvents> =
        await this.importFile(eventFile);

      this.on(event.event, event.execute);
      log.info({
        message: `Registered event "${eventName}"`,
        tag: LogTag.EVENTS,
      });
    }
  }
}
