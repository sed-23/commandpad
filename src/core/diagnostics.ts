import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageProvider } from './types';
import { minimatch } from '../util/minimatch';

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
    if (!this.matchesProvider(document)) {
      return;
    }
    const issues = this.provider.getDiagnostics(document.getText());
    const diagnostics = issues.map((issue) => {
      const range = new vscode.Range(issue.line, issue.column, issue.line, issue.endColumn ?? issue.column + 1);
      return new vscode.Diagnostic(range, issue.message, issue.severity);
    });
    this.collection.set(document.uri, diagnostics);
  }

  /** Check if a document belongs to this provider by language ID or file pattern */
  private matchesProvider(document: vscode.TextDocument): boolean {
    // Exact language ID match (e.g. dotenv, ini, makefile, shellscript)
    if (this.provider.languageIds.includes(document.languageId)) {
      return true;
    }
    // For files with generic language IDs (plaintext, properties), check file patterns
    const filePath = document.uri.fsPath;
    const fileName = path.basename(filePath);
    const relativePath = vscode.workspace.asRelativePath(document.uri, false);
    return this.provider.filePatterns.some((pattern) => {
      return minimatch(relativePath, pattern) || minimatch(fileName, pattern);
    });
  }

  dispose(): void {
    this.collection.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
