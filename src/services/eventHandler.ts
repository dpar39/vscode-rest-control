import * as vscode from "vscode";
import * as http from "http";
import * as https from "https";

function sendEvent(
  url: URL,
  eventName: string,
  eventData: any,
  httpMethod: string = "POST",
  onErrorMessage = "",
): Promise<void> {
  const payload = JSON.stringify({ name: eventName, data: eventData || null });
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: httpMethod,
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Content-Type": "application/json",
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  return new Promise((accept, reject) => {
    const httpModule = url.protocol.startsWith("https") ? https : http;
    const req = httpModule.request(options, (res) => {
      let data = "";
      ``;
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        accept();
      });
      res.on("error", (err) => {
        reject(err);
        vscode.window.showErrorMessage(`Error notifying of event ${eventName}: ${err}`, "OK");
      });
    });
    req.on("error", (err) => {
      req.destroy();
      vscode.window.showErrorMessage(`${onErrorMessage} - ${err}`, "OK");
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

let eventHandlerRegistrations: vscode.Disposable[] = [];
export async function registerEventHandler(
  eventHandlerEndpoint: string,
  eventTypes: string[],
  httpMethod: string,
  onErrorMessage: string,
) {
  httpMethod = httpMethod || "POST";
  for (let ehr of eventHandlerRegistrations) {
    ehr.dispose();
  }
  eventHandlerRegistrations = [];
  const url = new URL(eventHandlerEndpoint);
  if (eventTypes.includes("vscode.window.onDidChangeActiveTextEditor")) {
    eventHandlerRegistrations.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        sendEvent(
          url,
          "vscode.window.onDidChangeActiveTextEditor",
          editor?.document.uri.fsPath,
          httpMethod,
          onErrorMessage,
        );
      }),
    );
  }
  if (eventTypes.includes("foo")) {
  }
}
