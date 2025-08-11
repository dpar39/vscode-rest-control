import * as assert from "assert";
import { EXTENSION_ID } from "../../extension";
import * as fs from "fs";
import { IncomingMessage, Server, ServerResponse, createServer } from "http";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { makeRequest } from "./sendPostRequest";
import { AddressInfo } from "net";

class MockHttpServer {
  private _server: Server;

  constructor(
    onRequestCallback: (data: any | undefined) => void,
    onErrorCallback?: (err: Error) => void,
  ) {
    this._server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body: Buffer[] = [];
      req.on("data", (chunk) => {
        body.push(chunk);
      });
      req.on("end", () => {
        if (body.length > 0) {
          onRequestCallback(JSON.parse(Buffer.concat(body).toString()));
        } else {
          onErrorCallback?.(new Error("No data received"));
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({}));
      });

      req.on("error", (err) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Server error.");
        onErrorCallback?.(err);
      });
    });
  }

  start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this._server.listen(0, () => {
        const port = (this._server.address() as AddressInfo)!.port as number;
        resolve(`http://localhost:${port}`);
      });
      this._server.on("error", (err) => {
        console.error(`Error starting mock HTTP server: ${err}`);
        reject(err);
      });
    });
  }
}

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
    const content: string = (await makeRequest("custom.currentFileContent")) as string;
    const workspaceFolders = (await makeRequest("custom.workspaceFolders")) as any[];
    const workspaceAbsPath = workspaceFolders[0].uri.slice("file://".length);
    const expectedContent = fs.readFileSync(workspaceAbsPath + "/demo.py", {
      encoding: "utf-8",
    });
    assert(content === expectedContent);
  });

  test("get all opened files", async () => {
    const xx = await makeRequest("custom.goToFileLineCharacter", ["demo.py:17:28"]);
    const openedFiles: string[] = (await makeRequest("custom.listOpenedFiles")) as string[];
    assert(openedFiles.length > 0);
    assert(openedFiles.some((file) => file.endsWith("workspace1/demo.py")));
  });

  test("can get vscode.window.onDidChangeActiveTextEditor events", (done) => {
    const server = new MockHttpServer((data) => {
      console.log("Received event data:", data);
      assert(data.name === "vscode.window.onDidChangeActiveTextEditor");
      if (data.data !== null) {
        assert(data.data.endsWith("samples.http"));
        done();
      }
    });
    server.start().then(async (serverUrl) => {
      await makeRequest("custom.registerEventHandler", [
        serverUrl,
        ["vscode.window.onDidChangeActiveTextEditor"],
        "POST",
        "Failed to register event handler",
      ]);
      await makeRequest("custom.goToFileLineCharacter", ["samples.http:1:1"]);
    });
  });
});
