# Change Log

## [0.0.18]

- When registering events via `custom.registerEventHandler`, only show errors if argument `onErrorMessage` is set upon callback registration.

## [0.0.17]

- Added more event types that can be registered via `custom.registerEventHandler`

## [0.0.16]

- Added custom command `custom.listOpenedFiles` to get the list of all files currently opened
- Added custom command `custom.currentEditorContent` to get the content of the current (in-focus) editor as a string (if any)
- Added custom command `custom.registerEventHandler` so that an external HTTP server can handle events from VSCode API

## [0.0.15]

- Added custom error message when registering an external formatter via `custom.registerExternalFormatter`.
- Improved unit tests and linter checks (added code formatting check)

## [0.0.14]

- Added `custom.registerExternalFormatter` to support external formatters that send code snippets to a HTTP endpoint.
- Added more flexibility to `custom.goToFileLineCharacter` to handle file paths that include row and column number separated with colon `:` (e.g. `readme.txt:42:7`)

## [0.0.13]

- Bug Fix: VSCode folder to port hashing algorithm was not working correctly.

## [0.0.12]

- Bug Fix: When executing command "Developer: Reload Window", the previous TCP port could not be reused because the old extension process was not kill. Now it saves the PID and kills it the next time the extension is activated.

## [0.0.11]

- Bug Fix for `Access-Control-Allow-Origin: *` response header to allow calling VSCode REST Control from web browsers.

## [0.0.10]

- Added `Access-Control-Allow-Origin: *` response header to allow calling VSCode REST Control from web browsers.

## [0.0.9]

- Add support for processing URL encoded requests in the form `?command=value&args=urlencoded-of-json-representation-of-args`.

## [0.0.8]

- Assign the remote control port based on a hash of the path to the workspace or open folders if such port is available.

## [0.0.7]

- Added `custom.showInputBox` to show input box dialog to collect a input string from the user

## [0.0.6]

- Added `custom.getExtensionInfo` to get specific information about an extension by passing the extension ID as parameter. Use `custom.listInstalledExtensions`to list all installed extensions.

## [0.0.5]

- Added `custom.workspaceFile` and `custom.workspaceFolders` to retrieve the workspace file (if any) and folders currently opened in the workspace (if any)

- Added `custom.getCommands` to retrieve the full list of commands registered within vscode

## [0.0.4]

- Removed npm vulnerabilities

## [0.0.3]

- Added some more documentation
- Refactored some code

## [0.0.2]

- Removed option to configure the listening interface for security reasons. Now the extension can only listen on `localhost` interface.
- Added `custom.showQuickPick` command to run quick pick dialogs in vscode via automation.
- Command `custom.goToFileLineCharacter` can now take a relative path to the workspace.
- Added `custom.showInformationMessage`, `custom.showWarningMessage` and `custom.showErrorMessage` to show messages to the users in vscode.
- Setup continuous integration on pull request and continuous delivery to deploy the extension to VSCode

## [0.0.1]

- First release
