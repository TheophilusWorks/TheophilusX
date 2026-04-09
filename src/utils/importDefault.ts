import { pathToFileURL } from "node:url";

export async function importDefault<T>(filePath: string): Promise<T> {
  const url = pathToFileURL(filePath).href + `?t=${Date.now()}`;
  const mod = await import(url);
  return (mod.default?.default ?? mod.default) as T;
}
