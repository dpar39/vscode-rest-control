import * as assert from "assert";
import { EXTENSION_ID } from "../../extension";
import * as fs from "fs";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { makeRequest } from "./sendPostRequest";

suite("Extension Test Suite", () => {
  suiteSetup(async () => {});

  suiteTeardown(async () => {});

  test("check can list extensions", async () => {
    const extensionIds: string[] = (await makeRequest(
      "custom.listInstalledExtensions",
    )) as string[];
    assert(extensionIds.includes(EXTENSION_ID));
  }).timeout(5000);

  test("get workspace folders", async () => {
    const workspaceFolders = (await makeRequest("custom.workspaceFolders")) as any[];
    assert(workspaceFolders.length === 1);
    const ws = workspaceFolders[0];
    assert(ws.name === "workspace1");
    assert(ws.index === 0);
    assert(ws.uri.startsWith("file://"));
    assert(ws.uri.endsWith("/workspace1"));

    const workspaceFile = (await makeRequest(
      "custom.workspaceFile",
      undefined,
      undefined,
      false,
    )) as any;
    assert(workspaceFile === null); // no workspace file
  });

  test("get all commands registered in vscode", async () => {
    const commands: string[] = (await makeRequest("custom.getCommands")) as string[];
    assert(commands.length > 100);
  });

  test("test can open document and get its content", async () => {
    const xx = await makeRequest("custom.goToFileLineCharacter", ["demo.py:17:28"]);
    const content: string = (await makeRequest("custom.eval", [
      "vscode.window.activeTextEditor?.document.getText()",
    ])) as string;
    const workspaceFolders = (await makeRequest("custom.workspaceFolders")) as any[];
    const workspaceAbsPath = workspaceFolders[0].uri.slice("file://".length);
    const expectedContent = fs.readFileSync(workspaceAbsPath + "/demo.py", {
      encoding: "utf-8",
    });
    assert(content === expectedContent);
  });
});
