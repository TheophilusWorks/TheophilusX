import axios from "axios";
import fs from "fs";

export async function downloadFile(
  url: string,
  dest: string,
  headers: Record<string, string> = {},
): Promise<void> {
  const response = await axios.get(url, { responseType: "stream", headers });

  if (response.status !== 200)
    throw new Error(`HTTP status not OK: ${response.status}`);
  console.log("[say] content-type:", response.headers["content-type"]);
  await new Promise<void>((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(dest))
      .on("finish", resolve)
      .on("error", reject);
  });
}
