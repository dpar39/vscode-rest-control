import * as assert from "assert";
import * as path from "path";
import { EXTENSION_ID } from "../../extension";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { makeRequest } from "./sendPostRequest";
// import * as myExtension from '../extension';

async function sleep(ms: number): Promise<void> {
  return new Promise(
      (resolve) => setTimeout(resolve, ms));
}

suite("Extension Test Suite", () => {
  suiteSetup(async () => {
    const sampleWorkspace = path.resolve(__dirname, "../../../sampleWorkspace");
    let uri = vscode.Uri.file(sampleWorkspace);
    await vscode.commands.executeCommand("vscode.openFolder", uri);
    await sleep(3000);
  });

  suiteTeardown(() => {});

  test("check can list extensions", async () => {
    const extensionIds: string[] = (await makeRequest(
      "custom.listInstalledExtensions",
      []
    )) as string[];
    assert(extensionIds.includes(EXTENSION_ID));
  });
});
