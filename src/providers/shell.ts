import * as vscode from 'vscode';
import { LanguageProvider, ScriptTarget, TargetKind, DiagnosticInfo } from '../core/types';

export const shellProvider: LanguageProvider = {
  id: 'shell',
  displayName: 'Shell',
  languageIds: ['shellscript'],
  filePatterns: ['**/*.sh', '**/*.bash', '**/*.zsh', '**/*.ksh', '**/.bashrc', '**/.bash_profile', '**/.bash_aliases', '**/.bash_logout', '**/.zshrc', '**/.zshenv', '**/.zprofile', '**/.profile'],

  parseTargets(content: string): ScriptTarget[] {
    const targets: ScriptTarget[] = [];
    const lines = content.split('\n');
    const funcRegex = /^(?:function\s+)?([a-zA-Z_][\w]*)\s*\(\)\s*\{?/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(funcRegex);
      if (match) {
        let description: string | undefined;
        if (i > 0 && lines[i - 1].trim().startsWith('#')) {
          description = lines[i - 1].trim().replace(/^#+\s*/, '');
        }
        targets.push({ name: match[1], line: i, kind: TargetKind.Function, description });
      }
    }
    return targets;
  },

  buildCommand(target: ScriptTarget, filePath: string): string {
    const config = vscode.workspace.getConfiguration('commandpad');
    const shell = config.get<string>('shellCommand', 'bash');
    return `${shell} -c 'source "${filePath}" && ${target.name}'`;
  },

  getDiagnostics(content: string): DiagnosticInfo[] {
    const diags: DiagnosticInfo[] = [];
    const lines = content.split('\n');
    // Check for missing shebang
    if (lines.length > 0 && !lines[0].startsWith('#!')) {
      diags.push({
        line: 0, column: 0, endColumn: lines[0].length,
        message: 'Missing shebang (e.g., #!/bin/bash). Consider adding one.',
        severity: vscode.DiagnosticSeverity.Warning,
      });
    }
    return diags;
  },
};
