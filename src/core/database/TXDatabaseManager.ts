import mongoose, { Schema, Model } from "mongoose";
import TXLogger from "../logger/TXLogger.js";
import { DebugLevel } from "../../types/TXDebugLevel.js";

export default class TXDatabaseManager {
  private databaseKey: string;
  private logger: TXLogger;
  private models: Map<string, Model<any>> = new Map();

  constructor(databaseKey: string, logger: TXLogger) {
    this.databaseKey = databaseKey;
    this.logger = logger;
  }

  public async connect() {
    if (mongoose.connection.readyState === 1) return;

    this.logger.log("Connecting to MongoDB", DebugLevel.Info);
    await mongoose.connect(this.databaseKey);
    this.logger.log("Connected to MongoDB", DebugLevel.Ok);
  }

  public createModel<T>(name: string, schema: Schema<T>): Model<T> {
    if (this.models.has(name)) {
      return this.models.get(name) as Model<T>;
    }

    const model = mongoose.model<T>(name, schema);
    this.models.set(name, model);

    return model;
  }
}
