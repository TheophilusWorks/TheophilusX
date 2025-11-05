/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import mongoose, { Schema, Types, Model } from "mongoose";
import { PrettyLogger as log, LogTag } from "../utils/PrettyLogger";
import * as path from "path";
import { glob } from "glob";

export default class TXDatabase {
  private static _connection: typeof mongoose | null = null;
  private static _instance: TXDatabase | null = null;

  public static Schema = Schema;
  public static model = mongoose.model.bind(mongoose);
  public static Types = Types;

  constructor() {
    if (TXDatabase._instance) {
      return TXDatabase._instance;
    }
    TXDatabase._instance = this;
  }

  public async initialize(): Promise<void> {
    log.info({
      message: "TXDatabase initialization started",
      tag: LogTag.DATABASE,
    });

    await TXDatabase.connect(process.env.MONGODB_URI!);

    await this.autoMigrate();

    log.success({
      message: "TXDatabase ready",
      tag: LogTag.DATABASE,
    });
  }

  private static async connect(uri: string): Promise<void> {
    try {
      log.info({
        message: "Establishing database connection...",
        tag: LogTag.DATABASE,
      });

      this._connection = await mongoose.connect(uri);

      mongoose.connection.on("error", (error) => {
        log.error({
          message: "Database connection error",
          tag: LogTag.DATABASE,
          extra: [error],
        });
      });

      mongoose.connection.on("disconnected", () => {
        log.warn({
          message: "Database disconnected",
          tag: LogTag.DATABASE,
        });
      });

      mongoose.connection.on("reconnected", () => {
        log.success({
          message: "Database reconnected",
          tag: LogTag.DATABASE,
        });
      });

      log.success({
        message: "Database connection established",
        tag: LogTag.DATABASE,
      });
    } catch (error) {
      log.error({
        message: "Failed to connect to database",
        tag: LogTag.DATABASE,
        extra: [error],
      });
      process.exit(1);
    }
  }

  private async autoMigrate(): Promise<void> {
    try {
      log.info({
        message: "Starting database auto-migration...",
        tag: LogTag.DATABASE,
      });

      const modelsPath = path.join(__dirname, "../database/models");
      const modelFiles = await glob(`${modelsPath}/**/*.{ts,js}`);

      log.info({
        message: `Found ${modelFiles.length} model files`,
        tag: LogTag.DATABASE,
      });

      for (const modelFile of modelFiles) {
        try {
          const modelModule = await import(modelFile);
          const Model: Model<any> = modelModule.default || modelModule;
          const modelName = Model.modelName;
          const collectionName = Model.collection.name;

          log.info({
            message: `Processing model: ${modelName} (collection: ${collectionName})`,
            tag: LogTag.DATABASE,
          });

          const schema = Model.schema;
          const schemaPaths = schema.paths;

          const documents = await Model.find({}).lean();

          if (documents.length === 0) {
            log.warn({
              message: `No documents found in ${collectionName}, skipping...`,
              tag: LogTag.DATABASE,
            });
            continue;
          }

          let updatedCount = 0;
          const missingFieldsSet = new Set<string>();

          for (const doc of documents) {
            const updateFields: Record<string, any> = {};
            let hasUpdates = false;

            for (const [fieldPath, schemaType] of Object.entries(schemaPaths)) {
              if (fieldPath === "_id" || fieldPath === "__v") continue;

              if (!(fieldPath in doc)) {
                const defaultValue = (schemaType as any).defaultValue;

                if (defaultValue !== undefined) {
                  updateFields[fieldPath] =
                    typeof defaultValue === "function"
                      ? defaultValue()
                      : defaultValue;
                  hasUpdates = true;
                  missingFieldsSet.add(fieldPath);
                } else if (
                  (schemaType as any).options &&
                  (schemaType as any).options.default !== undefined
                ) {
                  const defVal = (schemaType as any).options.default;
                  updateFields[fieldPath] =
                    typeof defVal === "function" ? defVal() : defVal;
                  hasUpdates = true;
                  missingFieldsSet.add(fieldPath);
                }
              }
            }

            if (hasUpdates) {
              await Model.updateOne({ _id: doc._id }, { $set: updateFields });
              updatedCount++;
            }
          }

          if (updatedCount > 0) {
            const missingFields = Array.from(missingFieldsSet).join(", ");
            log.info({
              message: `Found missing fields (${missingFields}) in ${collectionName}`,
              tag: LogTag.DATABASE,
            });
            log.success({
              message: `Updated ${updatedCount} documents in ${collectionName}`,
              tag: LogTag.DATABASE,
            });
          } else {
            log.success({
              message: `All documents in ${collectionName} are up to date`,
              tag: LogTag.DATABASE,
            });
          }
        } catch (modelError: any) {
          log.error({
            message: `Error processing model file ${modelFile}`,
            tag: LogTag.DATABASE,
            extra: [modelError.message],
          });
        }
      }

      log.success({
        message: "Database auto-migration completed!",
        tag: LogTag.DATABASE,
      });
    } catch (error: any) {
      log.error({
        message: "Auto-migration failed",
        tag: LogTag.DATABASE,
        extra: [error.message],
      });
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    if (this._connection) {
      try {
        await mongoose.disconnect();
        log.success({
          message: "Database connection closed gracefully",
          tag: LogTag.DATABASE,
        });
      } catch (error) {
        log.error({
          message: "Error while disconnecting from database",
          tag: LogTag.DATABASE,
          extra: [error],
        });
      }
    } else {
      log.warn({
        message: "No active database connection to close",
        tag: LogTag.DATABASE,
      });
    }
  }

  public static isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  public static getConnectionState(): string {
    const states: { [key: number]: string } = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    return states[mongoose.connection.readyState] || "unknown";
  }

  public static get connection() {
    return mongoose.connection;
  }
}
