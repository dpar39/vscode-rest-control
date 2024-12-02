import * as vscode from "vscode";
import * as path from "path";

import { quickPick } from "./quickPick";
import { registerExternalFormatter } from "./formatter";

function createObject(arg: any): any {
  if (typeof arg === "object" && arg.hasOwnProperty("__type__")) {
    const type = arg.__type__;
    if (type === "Uri") {
      return vscode.Uri.parse(arg.args[0]);
    } else if (type === "Position") {
      return new vscode.Position(arg.args[0], arg.args[1]);
    } else if (type === "Range") {
      return new vscode.Range(arg.args[0], arg.args[1], arg.args[2], arg.args[3]);
    } else if (type === "Location") {
      return new vscode.Location(createObject(arg.args[0]), createObject(arg.args[1]));
    }
  }
  return arg;
}

function createArguments(args?: any[]): any[] {
  const args2: any[] = [];
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

export async function processRemoteControlRequest(command: string, args: any[]): Promise<any> {
  if (command === "custom.runInTerminal") {
    const terminal = vscode.window.activeTerminal;
    if (terminal) {
      terminal.show(true);
      for (let cmd of args) {
        terminal.sendText(cmd);
      }
      return;
    }
    throw new Error("No active terminal available");
  }

  if (command === "custom.startDebugSession") {
    const folder = args[0];
    const debugConfig = args[1];
    const success = await vscode.debug.startDebugging(folder, debugConfig);
    if (!success) {
      throw new Error("debug session failed to start");
    }
    return;
  }

  if (command === "custom.eval") {
    return eval(args[0]);
  }

  if (command === "custom.listInstalledExtensions") {
    return vscode.extensions.all.map((e) => e.id);
  }

  if (command === "custom.getExtensionInfo") {
    const extensionId = args[0];
    const extension = vscode.extensions.all.find((e) => e.id === extensionId);
    if (!extension) {
      throw new Error(`Extension with id=${extensionId} was not found`);
    }
    return extension;
  }

  if (command === "custom.workspaceFile") {
    return vscode.workspace.workspaceFile?.toString();
  }

  if (command === "custom.getCommands") {
    return await vscode.commands.getCommands();
  }

  if (command === "custom.workspaceFolders") {
    return vscode.workspace.workspaceFolders?.map((ws) => {
      return {
        name: ws.name,
        index: ws.index,
        uri: ws.uri.toString(),
      };
    });
  }

  if (command === "custom.showInformationMessage") {
    return await vscode.window.showInformationMessage(args[0], ...args.slice(1));
  }

  if (command === "custom.showWarningMessage") {
    return await vscode.window.showWarningMessage(args[0], ...args.slice(1));
  }

  if (command === "custom.showErrorMessage") {
    return await vscode.window.showErrorMessage(args[0], ...args.slice(1));
  }

  if (command === "custom.showQuickPick") {
    return await quickPick(args[0]);
  }

  if (command === "custom.showInputBox") {
    return await vscode.window.showInputBox(args[0]);
  }

  if (command === "custom.goToFileLineCharacter") {
    let filePath = args[0];
    let row = args[1];
    let col = args[2];
    const match = /([^:]+)(:\d+)?(:\d+)?/.exec(filePath);
    if (match) {
      filePath = match[1];
      row = row || (match[2] ? parseInt(match[2].substring(1)) - 1 : 0);
      col = col || (match[3] ? parseInt(match[3].substring(1)) - 1 : 0);
    }
    let uri = null;
    if (!path.isAbsolute(filePath)) {
      let candidates = await vscode.workspace.findFiles(filePath);
      if (candidates.length === 1) {
        uri = candidates[0];
      }
    } else {
      uri = vscode.Uri.file(filePath);
    }
    if (uri === null) {
      throw new Error(`Unable to locate file: ${filePath}`);
    }
    const position = new vscode.Position(row, col);
    const location = new vscode.Location(uri, position);
    return await vscode.commands.executeCommand("editor.action.goToLocations", uri, position, [
      location,
    ]);
  }

  if (command === "custom.registerExternalFormatter") {
    return await registerExternalFormatter(args[0], args[1], args[2], args[3]);
  }

  // try to run an arbitrary command with the arguments provided as is
  return await vscode.commands.executeCommand(command, ...args);
}
