import * as vscode from 'vscode';
import { LanguageProvider } from './types';

/**
 * Find All References: Shift+F12 on a target name shows all references in the file.
 */
export class ScriptReferenceProvider implements vscode.ReferenceProvider {
  constructor(private provider: LanguageProvider) {}

  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.ReferenceContext
  ): Promise<vscode.Location[]> {
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][\w.-]*/);
    if (!wordRange) { return []; }
    const word = document.getText(wordRange);

    // Verify it's a known target
    const targets = this.provider.parseTargets(document.getText());
    const isTarget = targets.some((t) => t.name === word);
    if (!isTarget) { return []; }

    const locations: vscode.Location[] = [];

    // Search current file
    this.findInDocument(document, word, locations);

    // Search other open documents
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.uri.toString() === document.uri.toString()) { continue; }
      if (!this.provider.languageIds.includes(doc.languageId)) { continue; }
      this.findInDocument(doc, word, locations);
    }

    // Search workspace files
    for (const pattern of this.provider.filePatterns) {
      const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 30);
      for (const file of files) {
        // Skip already-processed docs
        if (locations.some((l) => l.uri.toString() === file.toString())) { continue; }
        try {
          const doc = await vscode.workspace.openTextDocument(file);
          this.findInDocument(doc, word, locations);
        } catch { /* skip */ }
      }
    }

    return locations;
  }

  private findInDocument(document: vscode.TextDocument, word: string, locations: vscode.Location[]): void {
    const text = document.getText();
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const pos = document.positionAt(match.index);
      const range = new vscode.Range(pos, document.positionAt(match.index + word.length));
      locations.push(new vscode.Location(document.uri, range));
    }
  }
}
