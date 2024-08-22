import * as vscode from "vscode";
import * as tcpPorts from "tcp-port-used";
import { Logger } from "./services/logger";
import { IncomingMessage, ServerResponse } from "http";
import * as http from "http";
import { AddressInfo } from "net";
import { processRemoteControlRequest } from "./services/requestProcessor";

let server: http.Server;
let statusbar: vscode.StatusBarItem;

export const EXTENSION_ID: string = "dpar39.vscode-rest-control";
export function getListeningPort(): number | undefined {
  if (!server || !server.listening) {
    return;
  }
  const address = server.address() as any;
  return address?.port;
}

const SETTINGS_NAME: string = "restRemoteControl";

function setRemoteControlEnvironmentVariable(context: vscode.ExtensionContext, port: number = 0) {
  const RC_PORT_ENVVAR_NAME = "REMOTE_CONTROL_PORT";
  if (port === 0) {
    context.environmentVariableCollection.delete(RC_PORT_ENVVAR_NAME);
  } else {
    context.environmentVariableCollection.replace(RC_PORT_ENVVAR_NAME, port.toString());
  }
  const terminalUpdateCommand =
    port === 0 ? `unset ${RC_PORT_ENVVAR_NAME}` : `export ${RC_PORT_ENVVAR_NAME}=${port}`;
  vscode.window.terminals.map((terminal) => {
    if (terminal.exitStatus) {
      terminal.sendText(terminalUpdateCommand);
    }
  });
}

const startHttpServer = async (
  context: vscode.ExtensionContext,
  host: string,
  port: number,
  fallbackPorts: number[]
): Promise<void> => {
  let isInUse = false;
  if (port) {
    isInUse = await tcpPorts.check(port, host);
    if (isInUse) {
      if (fallbackPorts.length > 0) {
        const nextPort = fallbackPorts.shift();
        if (nextPort) {
          startHttpServer(context, host, nextPort, fallbackPorts);
          return;
        } else {
          isInUse = true;
        }
      } else {
        isInUse = true;
      }
    }
  }

  const endBadRequest = (err: any, res: ServerResponse) => {
    res.statusCode = 400;
    const errStringJson = JSON.stringify(err, Object.getOwnPropertyNames(err));
    res.write(errStringJson);
    res.end();
    Logger.error(errStringJson);
  };

  const processRequest = (cmd: string, args: string[], res: ServerResponse) => {
    processRemoteControlRequest(cmd, args)
      .then((data) => {
        res.setHeader("Content-Type", "application/json");
        res.write(JSON.stringify(data || null));
        res.end();
      })
      .catch((err) => endBadRequest(err, res));
  };

  const requestHandler = (req: IncomingMessage, res: ServerResponse) => {
    let body = "";
    let controlCommand: any = {};
    if (req.url && req.url.indexOf("?") >= 0) {
      const url = new URL(req.url, `http://${req.headers.host}/`);
      const queryParams = new URLSearchParams(url.search);
      try {
        const cmd = queryParams.get("command");
        const args = queryParams.has("args")
          ? JSON.parse(decodeURIComponent(queryParams.get("args")!))
          : [];
        Logger.info(`Remote request command=${cmd}, args=${args}`);
        processRequest(cmd!, args, res);
      } catch (err) {
        endBadRequest(err, res);
      }
    }

    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      Logger.info(`Remote request payload: ${body}`);
      const reqData = body ? JSON.parse(body) : controlCommand;
      processRequest(reqData.command, reqData.args || [], res);
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
    setRemoteControlEnvironmentVariable(context, verifiedPort);
    statusbar.text = `$(plug) RC Port: ${verifiedPort}`;
    statusbar.tooltip = listeningMessage;
  });
};

function getDefaultPortForWorkspace(): number {
  const identifier = vscode.workspace.workspaceFile
    ? vscode.workspace.workspaceFile.toString()
    : vscode.workspace.workspaceFolders?.join("");
  if (!identifier) {
    return 37100;
  }
  const hash = identifier.split("").reduce((a: number, b: string) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const port = 37100 + (Math.abs(hash) % 900);
  return port;
}

function setupRestControl(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration(SETTINGS_NAME);
  const enabled = config.get<number | null>("enable");
  if (enabled) {
    const port = config.get<number | null>("port");
    const fallbackPorts = config.get<number[] | null>("fallbacks");
    startHttpServer(
      context,
      "127.0.0.1",
      port || getDefaultPortForWorkspace(),
      (fallbackPorts || []).filter((p: number) => p !== port)
    );
    Logger.info("VSCode REST Control is now active!");
  } else {
    statusbar.tooltip = `REST remote control has been disabled via setting "${SETTINGS_NAME}.enabled": false`;
    statusbar.text = "$(debug-disconnect) RC Disabled";
    server?.close();
    setRemoteControlEnvironmentVariable(context);
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
export function deactivate(context: vscode.ExtensionContext) {
  server?.close();
  setRemoteControlEnvironmentVariable(context);
}
