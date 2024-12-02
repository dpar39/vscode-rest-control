import * as vscode from "vscode";
import * as tcpPorts from "tcp-port-used";
import * as fs from "fs";
import { Logger } from "./services/logger";
import { IncomingMessage, ServerResponse, Server, createServer } from "http";
import { AddressInfo } from "net";
import { processRemoteControlRequest } from "./services/requestProcessor";

let server: Server;
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
  fallbackPorts: number[],
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

  const sendResponse = (res: ServerResponse, body: string, statusCode: number = 200) => {
    res.statusCode = statusCode;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.write(body);
    res.end();
  };

  const endBadRequest = (err: any, res: ServerResponse) => {
    const errStringJson = JSON.stringify(err, Object.getOwnPropertyNames(err));
    sendResponse(res, errStringJson, 400);
    Logger.error(errStringJson);
  };

  const processRequest = (cmd: string, args: string[], res: ServerResponse) => {
    processRemoteControlRequest(cmd, args)
      .then((data) => sendResponse(res, JSON.stringify(data || null)))
      .catch((err) => endBadRequest(err, res));
  };

  const requestHandler = (req: IncomingMessage, res: ServerResponse) => {
    let command: string | null;
    let args: any[] = [];
    if (req.url && req.url.indexOf("?") >= 0) {
      const url = new URL(req.url, `http://${req.headers.host}/`);
      const queryParams = new URLSearchParams(url.search);
      command = queryParams.get("command");
      if (queryParams.has("args")) {
        args = JSON.parse(decodeURIComponent(queryParams.get("args")!));
      }
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      Logger.info(`Remote request payload: ${body}`);
      if (body) {
        const reqData = JSON.parse(body);
        command = reqData.command || command;
        args = reqData.args || args;
      }
      Logger.info(`Remote Control request with command=${command}, args=${args}`);
      processRequest(command!, args, res);
    });
  };
  // Start the HTTP server
  server = createServer(requestHandler);

  server.listen(isInUse ? 0 : port, host, () => {
    const address = server.address();
    const verifiedPort = (address as AddressInfo).port;
    const listeningMessage = `REST Control: Listening on "http://${host}:${verifiedPort}"`;

    Logger.info(listeningMessage);
    saveTcpPortProcessPid(context, verifiedPort);
    // set the remote control port as an environment variable
    setRemoteControlEnvironmentVariable(context, verifiedPort);
    statusbar.text = `$(plug) RC Port: ${verifiedPort}`;
    statusbar.tooltip = listeningMessage;
  });
};

function getDefaultPortForWorkspace(): number {
  const identifier = vscode.workspace.workspaceFile
    ? vscode.workspace.workspaceFile.toString()
    : vscode.workspace.workspaceFolders?.map((f) => f.uri.toString()).join("");
  if (!identifier) {
    return 37100;
  }
  const hash = identifier.split("").reduce((a: number, b: string) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const port = 37100 + (Math.abs(hash) % (65535 - 37100));
  return port;
}

function httpPortToPid(context: vscode.ExtensionContext, port: number): string {
  const cacheDir = context.globalStorageUri.fsPath;
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir + "/" + port + ".pid";
}

function killPreviousVscodeProcessIfUsingTcpPort(
  context: vscode.ExtensionContext,
  port: number | undefined,
) {
  Logger.info(`Checking if we need to kill previous process using port = ${port}`);
  if (!port) {
    return;
  }
  const portFile = httpPortToPid(context, port!);
  if (fs.existsSync(portFile)) {
    try {
      const pid = fs.readFileSync(portFile, "utf-8");
      Logger.info(`Found previous PID=${pid} for HTTP port ${port}`);
      process.kill(parseInt(pid));
    } catch (e) {
      Logger.warning(`Unable to kill process specified in ${portFile}`);
    }
    fs.unlinkSync(portFile);
  }
}
function saveTcpPortProcessPid(context: vscode.ExtensionContext, port: number | undefined) {
  if (!port) {
    Logger.warning(`HTTP port is ${port} - a port should have been selected.`);
  }
  const pid = process.pid;
  Logger.info(`Saving PID=${pid} as currently using HTTP port ${port}`);
  const portFile = httpPortToPid(context, port!);
  fs.writeFileSync(portFile, pid.toString());
}

function setupRestControl(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration(SETTINGS_NAME);
  const enabled = config.get<number | null>("enable");
  if (enabled) {
    const port = config.get<number | null>("port") || getDefaultPortForWorkspace();
    killPreviousVscodeProcessIfUsingTcpPort(context, port);
    const fallbackPorts = config.get<number[] | null>("fallbacks");
    startHttpServer(
      context,
      "127.0.0.1",
      port,
      (fallbackPorts || []).filter((p: number) => p !== port),
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
