import { fileURLToPath } from "node:url";
import path from "node:path";

export function getDirname(metaUrl: string) {
  return path.dirname(fileURLToPath(metaUrl));
}
