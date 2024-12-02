import * as http from "http";
import { getListeningPort } from "../../extension";

export async function makeRequest(
  command: string,
  args: any[] = [],
  port: number = 0,
  urlEncoded = true,
) {
  return new Promise((resolve, reject) => {
    const path = urlEncoded
      ? `/?command=${command}&args=${encodeURIComponent(JSON.stringify(args))}`
      : "/";
    const req = http.request(
      {
        method: "POST",
        hostname: "localhost",
        port: port || getListeningPort(),
        path: path,
      },
      (res) => {
        const chunks: any[] = [];
        res.on("data", (data) => chunks.push(data));
        res.on("end", () => {
          const resBody = Buffer.concat(chunks);
          resolve(JSON.parse(resBody.toString()));
        });
      },
    );
    req.on("error", reject);
    if (!urlEncoded) {
      const body = JSON.stringify({ command: command, args: args });
      req.write(body);
    }
    req.end();
  });
}
