import * as vscode from 'vscode';
import * as fs from 'fs';
import { LanguageProvider, TargetKind, ScriptTarget } from './types';

export class ScriptCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private provider: LanguageProvider) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const lineText = document.lineAt(position.line).text;
    const before = lineText.substring(0, position.character);

    // 1) In-file target completions
    const targets = this.provider.parseTargets(document.getText());
    for (const target of targets) {
      items.push(this.buildItem(target, document.uri));
    }

    // 2) Cross-file completions (from workspace)
    items.push(...this.getCrossFileCompletions(document.uri));

    // 3) Language-specific snippet completions
    items.push(...this.getSnippets(before));

    return items;
  }

  private buildItem(target: ScriptTarget, sourceUri: vscode.Uri): vscode.CompletionItem {
    const kind = target.kind === TargetKind.Function
      ? vscode.CompletionItemKind.Function
      : target.kind === TargetKind.Target
      ? vscode.CompletionItemKind.Event
      : vscode.CompletionItemKind.Reference;

    const item = new vscode.CompletionItem(target.name, kind);
    item.detail = `${this.provider.displayName} ${target.kind}: ${target.name}`;
    item.documentation = new vscode.MarkdownString();
    if (target.description) {
      item.documentation.appendText(target.description + '\n');
    }
    if (target.params && target.params.length > 0) {
      item.documentation.appendMarkdown(`**Params:** \`${target.params.join(', ')}\``);
    }
    item.sortText = '0_' + target.name; // sort project targets first
    return item;
  }

  private getCrossFileCompletions(currentUri: vscode.Uri): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const wsFolders = vscode.workspace.workspaceFolders;
    if (!wsFolders) { return items; }

    // Only include targets from other files of the same provider type
    for (const pattern of this.provider.filePatterns) {
      const globPattern = new vscode.RelativePattern(wsFolders[0], pattern);
      // Synchronously read cached files for speed (workspace.findFiles is async)
      // We'll rely on recently opened documents from the text document cache
    }

    for (const doc of vscode.workspace.textDocuments) {
      if (doc.uri.toString() === currentUri.toString()) { continue; }
      if (!this.provider.languageIds.includes(doc.languageId)) { continue; }

      const targets = this.provider.parseTargets(doc.getText());
      for (const t of targets) {
        const item = this.buildItem(t, doc.uri);
        const relPath = vscode.workspace.asRelativePath(doc.uri);
        item.detail = `${this.provider.displayName} ${t.kind} — ${relPath}`;
        item.sortText = '1_' + t.name; // after local targets
        items.push(item);
      }
    }
    return items;
  }

  private getSnippets(before: string): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const snippets = this.getProviderSnippets();

    for (const snip of snippets) {
      const item = new vscode.CompletionItem(snip.prefix, vscode.CompletionItemKind.Snippet);
      item.insertText = new vscode.SnippetString(snip.body);
      item.detail = snip.detail;
      item.documentation = new vscode.MarkdownString(snip.description);
      item.sortText = '2_' + snip.prefix;
      items.push(item);
    }
    return items;
  }

  private getProviderSnippets(): { prefix: string; body: string; detail: string; description: string }[] {
    switch (this.provider.id) {
      case 'makefile':
        return [
          { prefix: 'target', body: '${1:name}: ${2:deps}\n\t${0:command}', detail: 'Makefile target', description: 'Insert a new Makefile target with dependencies' },
          { prefix: 'phony', body: '.PHONY: ${1:targets}\n', detail: '.PHONY declaration', description: 'Declare phony targets' },
          { prefix: 'var', body: '${1:VAR} := ${0:value}', detail: 'Makefile variable', description: 'Define a Makefile variable' },
          { prefix: 'ifeq', body: 'ifeq (${1:a}, ${2:b})\n\t${0}\nendif', detail: 'Conditional', description: 'Insert an ifeq/endif block' },
          { prefix: 'foreach', body: '$(foreach ${1:var},${2:list},${0:body})', detail: 'foreach loop', description: 'Insert a foreach function call' },
        ];
      case 'shell':
        return [
          { prefix: 'func', body: '${1:name}() {\n\t${0}\n}', detail: 'Shell function', description: 'Insert a shell function' },
          { prefix: 'if', body: 'if [ ${1:condition} ]; then\n\t${0}\nfi', detail: 'if block', description: 'Insert an if/then/fi block' },
          { prefix: 'ifelse', body: 'if [ ${1:condition} ]; then\n\t${2}\nelse\n\t${0}\nfi', detail: 'if/else', description: 'Insert an if/else/fi block' },
          { prefix: 'for', body: 'for ${1:item} in ${2:list}; do\n\t${0}\ndone', detail: 'for loop', description: 'Insert a for/do/done loop' },
          { prefix: 'while', body: 'while [ ${1:condition} ]; do\n\t${0}\ndone', detail: 'while loop', description: 'Insert a while/do/done loop' },
          { prefix: 'case', body: 'case "${1:var}" in\n\t${2:pattern})\n\t\t${0}\n\t\t;;\n\t*)\n\t\techo "Unknown"\n\t\t;;\nesac', detail: 'case statement', description: 'Insert a case/esac block' },
          { prefix: 'shebang', body: '#!/usr/bin/env ${1|bash,sh,zsh|}\nset -euo pipefail\n\n${0}', detail: '#!/bin/bash', description: 'Insert a shebang with strict mode' },
          { prefix: 'trap', body: 'trap \'${1:cleanup}\' ${2|EXIT,ERR,INT,TERM|}', detail: 'Signal trap', description: 'Add a signal trap handler' },
        ];
      case 'powershell':
        return [
          { prefix: 'func', body: 'function ${1:Verb-Noun} {\n\t[CmdletBinding()]\n\tparam(\n\t\t${2}\n\t)\n\n\t${0}\n}', detail: 'PS Function', description: 'Insert a PowerShell function with CmdletBinding' },
          { prefix: 'param', body: '[Parameter(${1|Mandatory,ValueFromPipeline,Position=0|})]\n[${2:string}]$$${3:Name}', detail: 'Parameter', description: 'Insert a parameter attribute' },
          { prefix: 'trycatch', body: 'try {\n\t${1}\n} catch {\n\t Write-Error $$_.Exception.Message\n\t${0}\n}', detail: 'try/catch', description: 'Insert a try/catch block' },
          { prefix: 'foreach', body: 'foreach ($$${1:item} in $$${2:collection}) {\n\t${0}\n}', detail: 'foreach loop', description: 'Insert a foreach loop' },
          { prefix: 'if', body: 'if (${1:condition}) {\n\t${0}\n}', detail: 'if block', description: 'Insert an if block' },
          { prefix: 'switch', body: 'switch ($$${1:value}) {\n\t"${2:case1}" { ${3}; break }\n\tdefault { ${0} }\n}', detail: 'switch statement', description: 'Insert a switch block' },
        ];
      case 'batch':
        return [
          { prefix: 'label', body: ':${1:label}\n${0}\ngoto :eof', detail: 'Batch label', description: 'Insert a label block' },
          { prefix: 'if', body: 'if "${1:var}"=="${2:value}" (\n\t${0}\n)', detail: 'if block', description: 'Insert an if block' },
          { prefix: 'for', body: 'for %%${1:i} in (${2:set}) do (\n\t${0}\n)', detail: 'for loop', description: 'Insert a for loop' },
          { prefix: 'echo', body: '@echo off\n${0}', detail: '@echo off', description: 'Insert @echo off header' },
          { prefix: 'call', body: 'call :${1:label} ${0:args}', detail: 'call label', description: 'Call a label subroutine' },
        ];
      case 'env':
        return [
          { prefix: 'var', body: '${1:KEY}=${0:value}', detail: 'Env variable', description: 'Insert a KEY=value pair' },
          { prefix: 'section', body: '# ${1:Section Name}\n${2:KEY}=${0:value}', detail: 'Section comment', description: 'Insert a commented section header with a variable' },
          { prefix: 'db', body: 'DB_HOST=${1:localhost}\nDB_PORT=${2:5432}\nDB_NAME=${3:mydb}\nDB_USER=${4:postgres}\nDB_PASSWORD=${0:secret}', detail: 'Database config', description: 'Insert common database env vars' },
          { prefix: 'app', body: 'APP_NAME=${1:myapp}\nAPP_ENV=${2|development,staging,production|}\nAPP_PORT=${3:3000}\nAPP_DEBUG=${0|true,false|}', detail: 'App config', description: 'Insert common app env vars' },
        ];
      case 'config':
        return [
          { prefix: 'section', body: '[${1:section}]\n${2:key} = ${0:value}', detail: 'INI section', description: 'Insert a new INI section with a key' },
          { prefix: 'key', body: '${1:key} = ${0:value}', detail: 'Key = value', description: 'Insert a key=value pair' },
        ];
      default:
        return [];
    }
  }
}
