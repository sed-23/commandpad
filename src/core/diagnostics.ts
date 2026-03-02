import * as vscode from 'vscode';
import { LanguageProvider } from './types';

export class ScriptDiagnosticsManager {
  private collection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor(private provider: LanguageProvider) {
    this.collection = vscode.languages.createDiagnosticCollection(`scriptkit-${provider.id}`);
  }

  activate(): void {
    if (!this.provider.getDiagnostics) { return; }
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => this.lint(e.document))
    );
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => this.lint(doc))
    );
    vscode.workspace.textDocuments.forEach((doc) => this.lint(doc));
  }

  private lint(document: vscode.TextDocument): void {
    if (!this.provider.getDiagnostics) { return; }
    if (!this.provider.languageIds.includes(document.languageId)) { return; }
    const issues = this.provider.getDiagnostics(document.getText());
    const diagnostics = issues.map((issue) => {
      const range = new vscode.Range(issue.line, issue.column, issue.line, issue.endColumn ?? issue.column + 1);
      return new vscode.Diagnostic(range, issue.message, issue.severity);
    });
    this.collection.set(document.uri, diagnostics);
  }

  dispose(): void {
    this.collection.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
