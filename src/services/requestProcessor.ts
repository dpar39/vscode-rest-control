import * as vscode from "vscode";
import * as path from "path";

import { quickPick } from "./quickPick";
import { ControlRequest } from "../models/controlRequest";

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

export async function processRemoteControlRequest(requestObject: ControlRequest): Promise<any> {
  const command = requestObject.command;
  const args = createArguments(requestObject.args);

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

  if (command == "custom.startDebugSession") {
    const folder = args[0];
    const debugConfig = args[1];
    const success = await vscode.debug.startDebugging(folder, debugConfig);
    if (!success) {
      throw new Error("debug session failed to start");
    }
    return;
  }

  if (command === "custom.eval") {
    eval(args[0]);
    return;
  }

  if (command === "custom.listInstalledExtensions") {
    return vscode.extensions.all.map((e) => e.id);
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

  if (command == "custom.goToFileLineCharacter") {
    const filePath = args[0];
    let uri = null;
    if (!path.isAbsolute(filePath)) {
      let candidates = await vscode.workspace.findFiles(args[0]);
      if (candidates.length == 1) {
        uri = candidates[0];
      }
    } else {
      uri = vscode.Uri.file(filePath);
    }
    if (uri == null) {
      throw new Error(`Unable to locate file: ${filePath}`);
    }
    const position = new vscode.Position(args[1] || 0, args[2] || 0);
    const location = new vscode.Location(uri, position);
    return await vscode.commands.executeCommand("editor.action.goToLocations", uri, position, [
      location,
    ]);
  }

  // try to run an arbitrary command with the arguments provided as is
  return await vscode.commands.executeCommand(command, ...args);
}
