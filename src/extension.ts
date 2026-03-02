import * as vscode from 'vscode';
import * as fs from 'fs';
import { allProviders } from './providers';
import { LanguageProvider, ScriptTarget } from './core/types';
import { ScriptRunner } from './core/runner';
import { ScriptCodeLensProvider } from './core/codelens';
import { ScriptCompletionProvider } from './core/completions';
import { ScriptDiagnosticsManager } from './core/diagnostics';
import { ScriptTaskProvider } from './core/taskProvider';
import { ScriptDocumentSymbolProvider } from './core/symbols';
import { ScriptHoverProvider } from './core/hover';
import { ScriptDefinitionProvider } from './core/definition';
import { ScriptRenameProvider } from './core/rename';
import { ScriptReferenceProvider } from './core/references';
import { StatusBarManager } from './core/statusbar';

const runner = new ScriptRunner();
const diagnosticsManagers: ScriptDiagnosticsManager[] = [];
let statusBar: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('ScriptKit');
  output.appendLine('ScriptKit is now active!');

  // Status bar
  statusBar = new StatusBarManager();
  statusBar.activate();
  context.subscriptions.push(statusBar);

  // Register all providers
  for (const provider of allProviders) {
    registerProvider(context, provider);
  }

  // Command: run a specific target (used by CodeLens)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'scriptkit.runTarget',
      (providerId: string, target: ScriptTarget, filePath: string) => {
        const provider = allProviders.find((p) => p.id === providerId);
        if (!provider) {
          vscode.window.showErrorMessage(`ScriptKit: Unknown provider "${providerId}"`);
          return;
        }
        const command = provider.buildCommand(target, filePath);
        const dir = filePath.replace(/[/\\][^/\\]+$/, '');
        output.appendLine(`Running: ${command}`);
        runner.run(provider.id, command, dir);
      }
    )
  );

  // Command: pick a target from the current file via Quick Pick
  context.subscriptions.push(
    vscode.commands.registerCommand('scriptkit.pickTarget', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('ScriptKit: No active editor.');
        return;
      }

      const doc = editor.document;
      const provider = findProvider(doc);

      if (!provider) {
        vscode.window.showWarningMessage(
          `ScriptKit: No provider for this file type.`
        );
        return;
      }

      const targets = provider.parseTargets(doc.getText());
      if (targets.length === 0) {
        vscode.window.showInformationMessage('ScriptKit: No targets found in this file.');
        return;
      }

      const items = targets.map((t) => ({
        label: `$(symbol-${t.kind === 'function' ? 'function' : t.kind === 'target' ? 'event' : 'key'}) ${t.name}`,
        description: `${provider.displayName} ${t.kind} — line ${t.line + 1}`,
        detail: t.description,
        target: t,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: `Select a ${provider.displayName} target to run`,
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (picked) {
        const command = provider.buildCommand(picked.target, doc.uri.fsPath);
        const dir = doc.uri.fsPath.replace(/[/\\][^/\\]+$/, '');
        output.appendLine(`Running: ${command}`);
        runner.run(provider.id, command, dir);
      }
    })
  );

  // Command: list all targets across workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('scriptkit.listAllTargets', async () => {
      const allItems: {
        label: string;
        description: string;
        detail?: string;
        provider: LanguageProvider;
        target: ScriptTarget;
        filePath: string;
      }[] = [];

      for (const provider of allProviders) {
        for (const pattern of provider.filePatterns) {
          const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 20);
          for (const file of files) {
            try {
              const content = fs.readFileSync(file.fsPath, 'utf-8');
              const targets = provider.parseTargets(content);
              for (const target of targets) {
                const relPath = vscode.workspace.asRelativePath(file);
                allItems.push({
                  label: `$(symbol-${target.kind === 'function' ? 'function' : 'event'}) ${target.name}`,
                  description: `${provider.displayName} — ${relPath}:${target.line + 1}`,
                  detail: target.description,
                  provider,
                  target,
                  filePath: file.fsPath,
                });
              }
            } catch { /* skip unreadable files */ }
          }
        }
      }

      if (allItems.length === 0) {
        vscode.window.showInformationMessage('ScriptKit: No targets found in workspace.');
        return;
      }

      const picked = await vscode.window.showQuickPick(allItems, {
        placeHolder: 'Select a target to run from workspace',
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (picked) {
        const command = picked.provider.buildCommand(picked.target, picked.filePath);
        const dir = picked.filePath.replace(/[/\\][^/\\]+$/, '');
        runner.run(picked.provider.id, command, dir);
      }
    })
  );

  context.subscriptions.push({ dispose: () => runner.dispose() });

  output.appendLine(
    `Registered providers: ${allProviders.map((p) => p.displayName).join(', ')}`
  );
}

/** Build a document selector that matches both by languageId and file pattern */
function buildSelector(provider: LanguageProvider): vscode.DocumentSelector {
  return [
    ...provider.languageIds.map((id) => ({ language: id })),
    ...provider.filePatterns.map((pattern) => ({ scheme: 'file', pattern })),
  ];
}

/** Find the best provider for a given document (by languageId or filename) */
function findProvider(doc: vscode.TextDocument): LanguageProvider | undefined {
  // Try languageId first (most precise)
  const byLang = allProviders.find((p) => p.languageIds.includes(doc.languageId));
  if (byLang) { return byLang; }

  // Fall back to file-pattern matching
  return allProviders.find((p) => {
    const selector = buildSelector(p);
    return vscode.languages.match(selector, doc) > 0;
  });
}

function registerProvider(
  context: vscode.ExtensionContext,
  provider: LanguageProvider
): void {
  const selectors = buildSelector(provider);

  // CodeLens
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      selectors,
      new ScriptCodeLensProvider(provider)
    )
  );

  // Completions
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selectors,
      new ScriptCompletionProvider(provider)
    )
  );

  // Document Symbols (Outline & Breadcrumbs)
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      selectors,
      new ScriptDocumentSymbolProvider(provider)
    )
  );

  // Hover
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      selectors,
      new ScriptHoverProvider(provider)
    )
  );

  // Go to Definition
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      selectors,
      new ScriptDefinitionProvider(provider)
    )
  );

  // Rename
  context.subscriptions.push(
    vscode.languages.registerRenameProvider(
      selectors,
      new ScriptRenameProvider(provider)
    )
  );

  // Find References
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      selectors,
      new ScriptReferenceProvider(provider)
    )
  );

  // Task Provider
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      `scriptkit-${provider.id}`,
      new ScriptTaskProvider(provider)
    )
  );

  // Diagnostics
  if (provider.getDiagnostics) {
    const config = vscode.workspace.getConfiguration('scriptkit');
    if (config.get<boolean>('enableDiagnostics', true)) {
      const mgr = new ScriptDiagnosticsManager(provider);
      mgr.activate();
      diagnosticsManagers.push(mgr);
      context.subscriptions.push(mgr);
    }
  }
}

export function deactivate(): void {
  runner.dispose();
  diagnosticsManagers.forEach((m) => m.dispose());
  statusBar?.dispose();
}
