import * as vscode from "vscode";
import * as http from "http";
import * as https from "https";

let eventHandlerRegistrations: vscode.Disposable[] = [];

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

const workspaceEvents = {
  "vscode.workspace.onDidSaveTextDocument": vscode.workspace.onDidSaveTextDocument,
  "vscode.workspace.onDidOpenTextDocument": vscode.workspace.onDidOpenTextDocument,
  "vscode.workspace.onDidCloseTextDocument": vscode.workspace.onDidCloseTextDocument,
};

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
  const eventHandlerEndpointUrl = new URL(eventHandlerEndpoint);
  if (eventTypes.includes("vscode.window.onDidChangeActiveTextEditor")) {
    eventHandlerRegistrations.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        sendEvent(
          eventHandlerEndpointUrl,
          "vscode.window.onDidChangeActiveTextEditor",
          editor?.document.uri.fsPath,
          httpMethod,
          onErrorMessage,
        );
      }),
    );
  }

  if (eventTypes.includes("vscode.window.onDidChangeTextEditorSelection")) {
    eventHandlerRegistrations.push(
      vscode.window.onDidChangeTextEditorSelection((event) => {
        sendEvent(
          eventHandlerEndpointUrl,
          "vscode.window.onDidChangeTextEditorSelection",
          {
            fsPath: event.textEditor.document.uri.fsPath,
            selections: event.selections,
          },
          httpMethod,
          onErrorMessage,
        );
      }),
    );
  }

  for (const [eventType, eventHandler] of Object.entries(workspaceEvents)) {
    if (eventTypes.includes(eventType)) {
      eventHandlerRegistrations.push(
        eventHandler((document) => {
          sendEvent(
            eventHandlerEndpointUrl,
            eventType,
            document.uri.fsPath,
            httpMethod,
            onErrorMessage,
          );
        }),
      );
    }
  }
}
