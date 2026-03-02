import * as vscode from 'vscode';
import { LanguageProvider, ScriptTarget, TargetKind, DiagnosticInfo } from '../core/types';

export const envProvider: LanguageProvider = {
  id: 'env',
  displayName: 'Environment',
  languageIds: ['dotenv', 'properties', 'plaintext'],
  filePatterns: ['**/.env', '**/.env.*', '**/*.env', '**/.flaskenv'],

  parseTargets(content: string): ScriptTarget[] {
    const targets: ScriptTarget[] = [];
    const lines = content.split('\n');
    const keyRegex = /^([A-Za-z_][\w]*)\s*=/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) { continue; }

      const match = line.match(keyRegex);
      if (match) {
        const name = match[1];
        const value = line.substring(line.indexOf('=') + 1).trim();

        let description: string | undefined;
        // Look for comment above
        if (i > 0 && lines[i - 1].trim().startsWith('#')) {
          description = lines[i - 1].trim().replace(/^#+\s*/, '');
        }

        targets.push({
          name,
          line: i,
          kind: TargetKind.Target,
          description: description || (value ? `= ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}` : '(empty)'),
        });
      }
    }
    return targets;
  },

  buildCommand(target: ScriptTarget, filePath: string): string {
    // Echo the variable value — useful for debugging
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      return `findstr /B "${target.name}=" "${filePath}"`;
    }
    return `grep "^${target.name}=" "${filePath}"`;
  },

  getDiagnostics(content: string): DiagnosticInfo[] {
    const diags: DiagnosticInfo[] = [];
    const lines = content.split('\n');
    const seen = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) { continue; }

      const keyRegex = /^([A-Za-z_][\w]*)\s*=/;
      const match = line.match(keyRegex);

      if (match) {
        const key = match[1];

        // Duplicate detection
        if (seen.has(key)) {
          diags.push({
            line: i, column: 0, endColumn: key.length,
            message: `Duplicate key "${key}" (first defined on line ${(seen.get(key)! + 1)}).`,
            severity: vscode.DiagnosticSeverity.Warning,
          });
        } else {
          seen.set(key, i);
        }

        // Empty value warning
        const value = line.substring(line.indexOf('=') + 1).trim();
        if (!value) {
          diags.push({
            line: i, column: line.indexOf('=') + 1, endColumn: line.length,
            message: `"${key}" has no value assigned.`,
            severity: vscode.DiagnosticSeverity.Information,
          });
        }

        // Unquoted value with spaces
        if (value && value.includes(' ') && !value.startsWith('"') && !value.startsWith("'")) {
          diags.push({
            line: i, column: line.indexOf('=') + 1, endColumn: line.length,
            message: `Value contains spaces but is not quoted. This may cause issues in some environments.`,
            severity: vscode.DiagnosticSeverity.Warning,
          });
        }
      } else if (!line.startsWith('export ')) {
        // Invalid line format
        diags.push({
          line: i, column: 0, endColumn: line.length,
          message: 'Invalid .env format. Expected KEY=value.',
          severity: vscode.DiagnosticSeverity.Error,
        });
      }
    }
    return diags;
  },
};
