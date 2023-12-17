import * as vscode from "vscode";
import * as tcpPorts from "tcp-port-used";
import { Logger } from "./services/Logger";
import http, { IncomingMessage, ServerResponse } from "http";
import { AddressInfo } from "net";
import { ControlRequest } from "./models/controlRequest";

let server: http.Server;

const EXTENSION_ID: string = "dpar39.vscode-rest-control";
const SETTINGS_NAME: string = "restRemoteControl";

function createObject(arg: any): any {
  if (typeof arg === "object" && arg.hasOwnProperty("__type__")) {
    const type = arg.__type__;
    if (type == "Uri") {
      return vscode.Uri.parse(arg.args[0]);
    } else if (type == "Position") {
      return new vscode.Position(arg.args[0], arg.args[1]);
    } else if (type == "Range") {
      return new vscode.Range(arg.args[0], arg.args[1], arg.args[2], arg.args[3]);
    } else if (type == "Location") {
      return new vscode.Location(createObject(arg.args[0]), createObject(arg.args[1]));
    }
  }
  return arg;
}

function createArguments(args: Array<any>): any[] {
  const args2: Array<any> = [];
  if (args instanceof Array) {
    for (let arg of args) {
      if (arg instanceof Array) {
        args2.push(createArguments(arg));
      } else {
        args2.push(createObject(arg));
      }
    }
  }
  return args2;
}

const warningNotification = (port: number, newPort: number): void => {
  vscode.window
    .showWarningMessage(
      `REST Control: Port "${port}" was already in use. The extension opened on a port "${newPort}". If you want, you can configure another port via the "restRemoteControl.port" workspace setting.`,
      "Configure locally"
    )
    .then(async (option: string | undefined) => {
      if (option === "Configure locally") {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          `@ext:${EXTENSION_ID}`
        );
        await vscode.commands.executeCommand("workbench.action.openWorkspaceSettings");
      }
    });
};

async function processRemoteControlRequest(requestObject: ControlRequest) {
  const command = requestObject.command;
  const args = createArguments(requestObject.args);

  if (command === "custom.runInTerminal") {
    let terminal = vscode.window.activeTerminal;
    if (terminal) {
      terminal.show(true);
      for (let cmd of args) {
        terminal.sendText(cmd);
      }
      return;
    }
    return;
  }

  if (command == "custom.startDebugSession") {
    const folder = args[0];
    let debugConfig = args[1];
    await vscode.debug.startDebugging(folder, debugConfig);
    return;
  }

  if (command === "custom.eval") {
    eval(args[0]);
    return;
  }

  if (command == "custom.goToFileLineCharacter") {
    const uri = vscode.Uri.file(args[0]);
    const position = new vscode.Position(args[1] || 0, args[2] || 0);
    const location = new vscode.Location(uri, position);
    await vscode.commands.executeCommand("editor.action.goToLocations", uri, position, [location]);
    return;
  }
  // try to run an arbitrary command with the arguments provided as is
  await vscode.commands.executeCommand(command, ...args);
}

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
        .then(() => {
          res.write("SUCCESS");
          res.end();
        })
        .catch((err) => {
          res.statusCode = 400;
          res.write("FAILURE");
          res.end();
          Logger.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
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
    //set the remote control port as an environment variable
    context.environmentVariableCollection.replace("REMOTE_CONTROL_PORT", `${verifiedPort}`);

    if (showNotification) {
      vscode.window.showInformationMessage(listeningMessage);
    }

    const statusbar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusbar.text = `$(plug) RC Port: ${verifiedPort}`;
    statusbar.tooltip = listeningMessage;
    statusbar.show();

    if (isInUse) {
      warningNotification(port, verifiedPort);
    }
  });
};

export function activate(context: vscode.ExtensionContext) {
  const subscriptions = context.subscriptions;
  const config = vscode.workspace.getConfiguration(SETTINGS_NAME);
  const enabled = config.get<number | null>("enable");
  const host = config.get<string | null>("host");
  const port = config.get<number | null>("port");
  const fallbackPorts = config.get<number[] | null>("fallbacks");

  const openSettings = vscode.commands.registerCommand(`${SETTINGS_NAME}.openSettings`, () => {
    vscode.commands.executeCommand("workbench.action.openSettings", `@ext:${EXTENSION_ID}`);
  });
  subscriptions.push(openSettings);

  if (enabled) {
    startHttpServer(
      context,
      host || "127.0.0.1",
      port || 37100,
      (fallbackPorts || []).filter((p) => p !== port)
    );
    Logger.info("VSCode REST Control is now active!");
  } else {
    Logger.warning("VSCode REST Control is not running!");
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
  server?.close();
}
