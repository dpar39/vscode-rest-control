import * as assert from "assert";
import { EXTENSION_ID, server } from "../../extension";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { makeRequest } from "./sendPostRequest";

suite("Extension Test Suite", () => {
  suiteSetup(async () => { });

  suiteTeardown(() => { });

  test("check can list extensions", async () => {
    const address = server.address() as any;
    const extensionIds: string[] = (await makeRequest(
      "custom.listInstalledExtensions",
      [], address.port
    )) as string[];
    assert(extensionIds.includes(EXTENSION_ID));
  }).timeout(5000);
});
