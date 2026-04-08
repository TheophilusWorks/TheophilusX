import axios from "axios";
import fs from "fs";

export async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await axios.get(url, { responseType: "stream" });
  await new Promise<void>((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(dest))
      .on("finish", resolve)
      .on("error", reject);
  });
}
