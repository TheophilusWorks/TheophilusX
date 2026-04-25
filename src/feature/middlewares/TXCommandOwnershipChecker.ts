import TXMiddleware from "../../core/middleware/TXMiddleware.js";

export default class TXCommandOwnershipChecker extends TXMiddleware<"commandCreate" | "adminCommandCreate"> {
  constructor() {
    super();
  }
}
