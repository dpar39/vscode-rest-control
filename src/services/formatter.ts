import * as vscode from "vscode";
import * as http from "http";
import * as https from "https";

let formatterRegistration: vscode.Disposable;
const defaultErrorMessage =
  "Error sending request to the external formatter. Make sure the formatter HTTP endpoint is up and running.";
export async function registerExternalFormatter(
  formatterEndpoint: string,
  languages: string[],
  httpMethod: string,
  onErrorMessage: string,
) {
  languages = languages || (await vscode.languages.getLanguages());
  httpMethod = httpMethod || "POST";
  onErrorMessage = onErrorMessage || defaultErrorMessage;

  if (formatterRegistration) {
    formatterRegistration.dispose();
  }
  const url = new URL(formatterEndpoint);
  formatterRegistration = vscode.languages.registerDocumentFormattingEditProvider(languages, {
    provideDocumentFormattingEdits(
      doc: vscode.TextDocument,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      const payload = JSON.stringify({
        file: doc.fileName,
        language: doc.languageId,
        snippet: doc.getText(),
      });
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: httpMethod,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };
      const range = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end,
      );
      return new Promise((accept, reject) => {
        const httpModule = url.protocol.startsWith("https") ? https : http;
        const req = httpModule.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            accept([vscode.TextEdit.replace(range, data)]);
          });
          res.on("error", (err) => {
            accept([]); // no edits
            vscode.window.showErrorMessage(
              `Failed to format document with custom formatter: ${err}`,
              "OK",
            );
          });
        });
        req.on("error", (err) => {
          req.destroy();
          accept([]); // no edits
          vscode.window.showErrorMessage(`${onErrorMessage} - ${err}`, "OK");
        });
        req.write(payload);
        req.end();
      });
    },
  });
}
