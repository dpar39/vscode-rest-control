# Change Log

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
