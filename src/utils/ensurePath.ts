import fs from "fs/promises";
import path from "path";

export async function ensurePath(targetPath: string): Promise<void> {
  try {
    await fs.access(targetPath);
  } catch {
    // check if it looks like a file (has extension)
    const ext = path.extname(targetPath);
    if (ext) {
      // ensure parent dir exists then create empty file
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, "");
    } else {
      // treat as directory
      await fs.mkdir(targetPath, { recursive: true });
    }
  }
}
