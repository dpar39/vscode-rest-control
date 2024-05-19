import * as http from "http";
import { getListeningPort } from "../../extension";

export async function makeRequest(command: string, args: any[] = [], port: number = 0) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method: "POST",
        hostname: "localhost",
        port: port || getListeningPort(),
        path: "/",
      },
      (res) => {
        const chunks: any[] = [];
        res.on("data", (data) => chunks.push(data));
        res.on("end", () => {
          const resBody = Buffer.concat(chunks);
          resolve(JSON.parse(resBody.toString()));
        });
      }
    );
    req.on("error", reject);
    const body = JSON.stringify({ command: command, args: args });
    req.write(body);
    req.end();
  });
}
