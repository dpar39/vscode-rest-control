import * as assert from "assert";
import { EXTENSION_ID } from "../../extension";

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
    const workspaceFolders = (await makeRequest("custom.workspaceFolders")) as string[];
    assert(workspaceFolders.length === 1);
    const ws = workspaceFolders[0] as any;
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

  test("get all commands registred in vscode", async () => {
    const commands: string[] = (await makeRequest("custom.getCommands")) as string[];
    assert(commands.length > 100);
  });
});
