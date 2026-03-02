import * as vscode from 'vscode';
import { LanguageProvider } from './types';

export class ScriptCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor(private provider: LanguageProvider) {}

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const config = vscode.workspace.getConfiguration('scriptkit');
    if (!config.get<boolean>('enableCodeLens', true)) {
      return [];
    }
    const targets = this.provider.parseTargets(document.getText());
    return targets.map((target) => {
      const range = new vscode.Range(target.line, 0, target.line, 0);
      return new vscode.CodeLens(range, {
        title: `$(play) Run ${target.name}`,
        command: 'scriptkit.runTarget',
        arguments: [this.provider.id, target, document.uri.fsPath],
        tooltip: target.description || `Run ${target.kind}: ${target.name}`,
      });
    });
  }

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
