import * as vscode from 'vscode';
import { LanguageProvider } from './types';

/**
 * Rename: F2 on a target name renames all references within the file.
 * Works for targets/functions/labels/env keys.
 */
export class ScriptRenameProvider implements vscode.RenameProvider {
  constructor(private provider: LanguageProvider) {}

  prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Range | { range: vscode.Range; placeholder: string } | undefined {
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][\w.-]*/);
    if (!wordRange) { return undefined; }
    const word = document.getText(wordRange);

    const targets = this.provider.parseTargets(document.getText());
    const target = targets.find((t) => t.name === word);
    if (!target) { return undefined; }

    return { range: wordRange, placeholder: word };
  }

  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string
  ): vscode.WorkspaceEdit | undefined {
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][\w.-]*/);
    if (!wordRange) { return undefined; }
    const oldName = document.getText(wordRange);

    const targets = this.provider.parseTargets(document.getText());
    const target = targets.find((t) => t.name === oldName);
    if (!target) { return undefined; }

    const edit = new vscode.WorkspaceEdit();
    const text = document.getText();

    // Find all occurrences of the name in the file (word-boundary aware)
    const regex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + oldName.length);
      edit.replace(document.uri, new vscode.Range(startPos, endPos), newName);
    }

    return edit;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
