import * as vscode from 'vscode';
import { LanguageProvider, ScriptTarget, TargetKind, DiagnosticInfo } from '../core/types';

export const configProvider: LanguageProvider = {
  id: 'config',
  displayName: 'Config',
  languageIds: ['ini', 'properties', 'plaintext'],
  filePatterns: ['**/*.ini', '**/*.cfg', '**/*.conf', '**/*.config', '**/*.properties', '**/*.cnf', '**/*.inf', '**/.editorconfig'],

  parseTargets(content: string): ScriptTarget[] {
    const targets: ScriptTarget[] = [];
    const lines = content.split('\n');
    const sectionRegex = /^\[([^\]]+)\]/;
    const keyRegex = /^([A-Za-z_][\w.-]*)\s*[=:]/;

    let currentSection: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) { continue; }

      // Section headers [section]
      const sectionMatch = line.match(sectionRegex);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        targets.push({
          name: `[${currentSection}]`,
          line: i,
          kind: TargetKind.Label,
          description: `Section: ${currentSection}`,
        });
        continue;
      }

      // Key-value pairs
      const keyMatch = line.match(keyRegex);
      if (keyMatch) {
        const name = currentSection ? `${currentSection}.${keyMatch[1]}` : keyMatch[1];
        const separator = line.includes('=') ? '=' : ':';
        const value = line.substring(line.indexOf(separator) + 1).trim();

        targets.push({
          name: keyMatch[1],
          line: i,
          kind: TargetKind.Target,
          description: value ? `= ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}` : '(empty)',
        });
      }
    }
    return targets;
  },

  buildCommand(target: ScriptTarget, filePath: string): string {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      return `findstr /I "${target.name}" "${filePath}"`;
    }
    return `grep -i "${target.name}" "${filePath}"`;
  },

  getDiagnostics(content: string): DiagnosticInfo[] {
    const diags: DiagnosticInfo[] = [];
    const lines = content.split('\n');
    const sectionKeys = new Map<string, Map<string, number>>();
    let currentSection = '__global__';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) { continue; }

      const sectionMatch = line.match(/^\[([^\]]+)\]/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        if (!sectionKeys.has(currentSection)) {
          sectionKeys.set(currentSection, new Map());
        }
        continue;
      }

      if (!sectionKeys.has(currentSection)) {
        sectionKeys.set(currentSection, new Map());
      }

      const keyMatch = line.match(/^([A-Za-z_][\w.-]*)\s*[=:]/);
      if (keyMatch) {
        const key = keyMatch[1];
        const sectionMap = sectionKeys.get(currentSection)!;

        // Duplicate key in same section
        if (sectionMap.has(key)) {
          diags.push({
            line: i, column: 0, endColumn: key.length,
            message: `Duplicate key "${key}" in section [${currentSection}] (first on line ${sectionMap.get(key)! + 1}).`,
            severity: vscode.DiagnosticSeverity.Warning,
          });
        } else {
          sectionMap.set(key, i);
        }
      }
    }
    return diags;
  },
};
