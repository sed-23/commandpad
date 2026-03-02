import * as vscode from 'vscode';
import { LanguageProvider } from './types';

/**
 * Go-to-definition: Ctrl+Click / F12 on a target name jumps to its definition.
 * Works within the current file and across workspace files of the same type.
 */
export class ScriptDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private provider: LanguageProvider) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.LocationLink[] | undefined> {
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][\w.-]*/);
    if (!wordRange) { return undefined; }
    const word = document.getText(wordRange);

    const locations: vscode.LocationLink[] = [];

    // Search current file first
    const localTargets = this.provider.parseTargets(document.getText());
    const localMatch = localTargets.find((t) => t.name === word);
    if (localMatch) {
      const targetRange = new vscode.Range(localMatch.line, 0, localMatch.line, word.length);
      locations.push({
        originSelectionRange: wordRange,
        targetUri: document.uri,
        targetRange,
        targetSelectionRange: targetRange,
      });
    }

    // Search other open documents with the same language
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.uri.toString() === document.uri.toString()) { continue; }
      if (!this.provider.languageIds.includes(doc.languageId)) { continue; }

      const targets = this.provider.parseTargets(doc.getText());
      const match = targets.find((t) => t.name === word);
      if (match) {
        const targetRange = new vscode.Range(match.line, 0, match.line, word.length);
        locations.push({
          originSelectionRange: wordRange,
          targetUri: doc.uri,
          targetRange,
          targetSelectionRange: targetRange,
        });
      }
    }

    // Search workspace files if we found nothing yet
    if (locations.length === 0) {
      for (const pattern of this.provider.filePatterns) {
        const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 20);
        for (const file of files) {
          if (file.toString() === document.uri.toString()) { continue; }
          try {
            const doc = await vscode.workspace.openTextDocument(file);
            const targets = this.provider.parseTargets(doc.getText());
            const match = targets.find((t) => t.name === word);
            if (match) {
              const targetRange = new vscode.Range(match.line, 0, match.line, word.length);
              locations.push({
                originSelectionRange: wordRange,
                targetUri: file,
                targetRange,
                targetSelectionRange: targetRange,
              });
            }
          } catch { /* skip unreadable */ }
        }
      }
    }

    return locations.length > 0 ? locations : undefined;
  }
}
