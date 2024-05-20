# Change Log

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
