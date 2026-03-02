import * as vscode from 'vscode';
import { LanguageProvider, ScriptTarget, TargetKind, DiagnosticInfo } from '../core/types';

export const makefileProvider: LanguageProvider = {
  id: 'makefile',
  displayName: 'Makefile',
  languageIds: ['makefile'],
  filePatterns: ['**/Makefile', '**/makefile', '**/GNUmakefile', '**/*.mk', '**/*.make'],

  parseTargets(content: string): ScriptTarget[] {
    const targets: ScriptTarget[] = [];
    const lines = content.split('\n');
    const regex = /^([a-zA-Z_][\w.-]*)(?:\s*:(?!=))/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match) {
        const name = match[1];
        // Skip built-in/implicit targets
        if (name.startsWith('.') && name !== '.PHONY') { continue; }
        if (name === '.PHONY') { continue; }

        let description: string | undefined;
        if (i > 0 && lines[i - 1].trim().startsWith('#')) {
          description = lines[i - 1].trim().replace(/^#+\s*/, '');
        }

        targets.push({ name, line: i, kind: TargetKind.Target, description });
      }
    }
    return [...new Map(targets.map(t => [t.name, t])).values()];
  },

  buildCommand(target: ScriptTarget, filePath: string): string {
    const config = vscode.workspace.getConfiguration('scriptkit');
    const makeCmd = config.get<string>('makeCommand', 'make');
    const dir = filePath.replace(/[/\\][^/\\]+$/, '');
    return `${makeCmd} -C "${dir}" ${target.name}`;
  },

  getDiagnostics(content: string): DiagnosticInfo[] {
    const diags: DiagnosticInfo[] = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Recipe lines must use tabs, not spaces
      if (line.match(/^ {1,7}\S/) && i > 0 && lines[i - 1].match(/^[a-zA-Z_][\w.-]*\s*:/)) {
        diags.push({
          line: i, column: 0, endColumn: line.search(/\S/),
          message: 'Recipe lines must be indented with a tab, not spaces.',
          severity: vscode.DiagnosticSeverity.Error,
        });
      }
    }
    return diags;
  },
};
