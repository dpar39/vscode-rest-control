import * as assert from "assert";
import { EXTENSION_ID, getListeningPort } from "../../extension";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { makeRequest } from "./sendPostRequest";

suite("Extension Test Suite", () => {
  suiteSetup(async () => { });

  suiteTeardown(() => { });

  test("check can list extensions", async () => {
    const extensionIds: string[] = (await makeRequest(
      "custom.listInstalledExtensions",
      [], getListeningPort()
    )) as string[];
    assert(extensionIds.includes(EXTENSION_ID));
  }).timeout(5000);
});
