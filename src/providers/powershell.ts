import * as vscode from 'vscode';
import { LanguageProvider, ScriptTarget, TargetKind, DiagnosticInfo } from '../core/types';

export const powershellProvider: LanguageProvider = {
  id: 'powershell',
  displayName: 'PowerShell',
  languageIds: ['powershell'],
  filePatterns: ['**/*.ps1', '**/*.psm1', '**/*.psd1'],

  parseTargets(content: string): ScriptTarget[] {
    const targets: ScriptTarget[] = [];
    const lines = content.split('\n');
    const funcRegex = /^function\s+([A-Za-z][\w-]*)\s*(?:\([^)]*\))?\s*\{?/i;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(funcRegex);
      if (match) {
        let description: string | undefined;
        // Look for <# .SYNOPSIS #> or # comment above
        if (i > 0 && lines[i - 1].trim().startsWith('#')) {
          description = lines[i - 1].trim().replace(/^#+\s*/, '');
        }

        // Extract params from the function signature
        const paramMatch = lines[i].match(/\(([^)]*)\)/);
        const params = paramMatch
          ? paramMatch[1].split(',').map(p => p.trim()).filter(Boolean)
          : undefined;

        targets.push({ name: match[1], line: i, kind: TargetKind.Function, description, params });
      }
    }
    return targets;
  },

  buildCommand(target: ScriptTarget, filePath: string): string {
    const config = vscode.workspace.getConfiguration('scriptkit');
    const ps = config.get<string>('powershellCommand', 'pwsh');
    return `${ps} -Command ". '${filePath}'; ${target.name}"`;
  },

  getDiagnostics(content: string): DiagnosticInfo[] {
    const diags: DiagnosticInfo[] = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Warn about using aliases in scripts
      const aliasPattern = /\b(ls|cat|curl|wget|rm|cp|mv|ps|kill|mount|sleep|sort|tee|man)\b/;
      const aliasMatch = line.match(aliasPattern);
      if (aliasMatch && !line.trim().startsWith('#')) {
        diags.push({
          line: i, column: aliasMatch.index || 0,
          endColumn: (aliasMatch.index || 0) + aliasMatch[0].length,
          message: `'${aliasMatch[0]}' is a Unix alias in PowerShell. Consider using the full cmdlet name for portability.`,
          severity: vscode.DiagnosticSeverity.Information,
        });
      }
    }
    return diags;
  },
};
