import * as vscode from "vscode";
import * as tcpPorts from "tcp-port-used";
import { Logger } from "./services/logger";
import { IncomingMessage, ServerResponse } from "http";
import * as http from "http";
import { AddressInfo } from "net";
import { ControlRequest } from "./models/controlRequest";
import { processRemoteControlRequest } from "./services/requestProcessor";

let server: http.Server;
let statusbar: vscode.StatusBarItem;

export const EXTENSION_ID: string = "dpar39.vscode-rest-control";
const SETTINGS_NAME: string = "restRemoteControl";

const startHttpServer = async (
  context: vscode.ExtensionContext,
  host: string,
  port: number,
  fallbackPorts: number[],
  showNotification: boolean = false
): Promise<void> => {
  let isInUse = false;
  if (port) {
    isInUse = await tcpPorts.check(port, host);
    if (isInUse) {
      if (fallbackPorts.length > 0) {
        const nextPort = fallbackPorts.shift();
        if (nextPort) {
          startHttpServer(context, host, nextPort, fallbackPorts, true);
          return;
        } else {
          isInUse = true;
        }
      } else {
        isInUse = true;
      }
    }
  }

  const requestHandler = (req: IncomingMessage, res: ServerResponse) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      Logger.info(`Remote request payload: ${body}`);
      const reqData = JSON.parse(body);
      processRemoteControlRequest(reqData as ControlRequest)
        .then((data) => {
          res.setHeader("Content-Type", "application/json");
          res.write(JSON.stringify(data || {}));
          res.end();
        })
        .catch((err) => {
          res.statusCode = 400;
          const errStringJson = JSON.stringify(err, Object.getOwnPropertyNames(err));
          res.write(errStringJson);
          res.end();
          Logger.error(errStringJson);
        });
    });
  };
  // Start the HTTP server
  server = http.createServer(requestHandler);

  server.listen(isInUse ? 0 : port, host, () => {
    const address = server.address();
    const verifiedPort = (address as AddressInfo).port;
    const listeningMessage = `REST Control: Listening on "http://${host}:${verifiedPort}"`;

    Logger.info(listeningMessage);
    // set the remote control port as an environment variable
    context.environmentVariableCollection.replace("REMOTE_CONTROL_PORT", `${verifiedPort}`);
    statusbar.text = `$(plug) RC Port: ${verifiedPort}`;
    statusbar.tooltip = listeningMessage;
  });
};

function setupRestControl(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration(SETTINGS_NAME);
  const enabled = config.get<number | null>("enable");
  if (enabled) {
    const port = config.get<number | null>("port");
    const fallbackPorts = config.get<number[] | null>("fallbacks");
    startHttpServer(
      context,
      "127.0.0.1",
      port || 37100,
      (fallbackPorts || []).filter((p: number) => p !== port)
    );
    Logger.info("VSCode REST Control is now active!");
  } else {
    statusbar.tooltip = `REST remote control has been disabled via setting "${SETTINGS_NAME}.enabled": false`;
    statusbar.text = "$(debug-disconnect) RC Disabled";
    server?.close();
    Logger.info("VSCode REST Control has been disabled via settings!");
  }
}

// activate extension method
export function activate(context: vscode.ExtensionContext) {
  const subscriptions = context.subscriptions;
  const openSettings = vscode.commands.registerCommand(`${SETTINGS_NAME}.openSettings`, () => {
    vscode.commands.executeCommand("workbench.action.openSettings", `@ext:${EXTENSION_ID}`);
  });
  statusbar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  subscriptions.push(openSettings);
  vscode.workspace.onDidChangeConfiguration((event) => {
    let affected = event.affectsConfiguration(`${SETTINGS_NAME}`);
    if (affected) {
      setupRestControl(context);
    }
  });
  setupRestControl(context);
  statusbar.show();
}

// deactivate extension method
export function deactivate() {
  server?.close();
}
