import * as vscode from 'vscode';
import { LanguageProvider, ScriptTarget, TargetKind } from './types';

export class ScriptHoverProvider implements vscode.HoverProvider {
  constructor(private provider: LanguageProvider) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][\w.-]*/);
    if (!wordRange) { return undefined; }
    const word = document.getText(wordRange);

    const targets = this.provider.parseTargets(document.getText());
    const target = targets.find((t) => t.name === word);
    if (!target) { return undefined; }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    // Header
    const icon = target.kind === TargetKind.Function ? 'symbol-function'
      : target.kind === TargetKind.Target ? 'symbol-event' : 'symbol-key';
    md.appendMarkdown(`**$(${icon}) ${this.provider.displayName} ${target.kind}** \`${target.name}\`\n\n`);

    // Description
    if (target.description) {
      md.appendMarkdown(`${target.description}\n\n`);
    }

    // Parameters
    if (target.params && target.params.length > 0) {
      md.appendMarkdown(`**Parameters:** ${target.params.map(p => `\`${p}\``).join(', ')}\n\n`);
    }

    // Location
    md.appendMarkdown(`*Defined on line ${target.line + 1}*\n\n`);

    // Run command link
    const args = encodeURIComponent(JSON.stringify([this.provider.id, target, document.uri.fsPath]));
    md.appendMarkdown(`[▶ Run ${target.name}](command:scriptkit.runTarget?${args})`);

    return new vscode.Hover(md, wordRange);
  }
}
