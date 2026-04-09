import mongoose from "mongoose";
import TXLogger from "../logger/TXLogger.js";
import { DebugLevel } from "../../types/TXDebugLevel.js";

export default class TXDatabaseManager {
  private databaseKey: string;
  private logger: TXLogger;

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
}
