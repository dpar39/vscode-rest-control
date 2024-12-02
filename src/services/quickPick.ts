import * as vscode from "vscode";

export async function quickPick(data: any) {
  return new Promise<readonly vscode.QuickPickItem[] | undefined>((resolve) => {
    const picker = vscode.window.createQuickPick();
    picker.canSelectMany = data.canSelectMany || false;
    picker.matchOnDescription = true;
    picker.matchOnDetail = data.matchOnDetail || true;
    picker.placeholder = data.placeHolder;
    picker.title = data.title;

    picker.items = data.items;
    const defaultLabel = data.defaultLabel;

    const disposable = vscode.Disposable.from(
      picker,
      picker.onDidAccept(() => {
        resolve(picker.selectedItems);
        disposable.dispose();
      }),

      picker.onDidHide(() => {
        resolve(picker.selectedItems);
        disposable.dispose();
      }),
    );
    for (const item of picker.items) {
      if (item.label === defaultLabel) {
        picker.activeItems = [item];
        break;
      }
    }
    picker.show();
  });
}
