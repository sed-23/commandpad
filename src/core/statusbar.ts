import * as vscode from 'vscode';
import { allProviders } from '../providers';

/**
 * Shows target count in the status bar for the active file.
 * e.g. "$(symbol-event) 5 targets"
 */
export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    this.item.command = 'scriptkit.pickTarget';
    this.item.tooltip = 'Click to pick & run a target';
  }

  activate(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.update())
    );
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => this.update())
    );
    this.update();
  }

  private update(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.item.hide();
      return;
    }

    const doc = editor.document;
    const provider = allProviders.find((p) => p.languageIds.includes(doc.languageId));
    if (!provider) {
      this.item.hide();
      return;
    }

    const targets = provider.parseTargets(doc.getText());
    if (targets.length === 0) {
      this.item.hide();
      return;
    }

    const noun = targets.length === 1 ? 'target' : 'targets';
    this.item.text = `$(symbol-event) ${targets.length} ${noun}`;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
