import * as vscode from 'vscode';
import * as fs from 'fs';
import { LanguageProvider } from './types';

export class ScriptTaskProvider implements vscode.TaskProvider {
  constructor(private provider: LanguageProvider) {}

  async provideTasks(): Promise<vscode.Task[]> {
    const tasks: vscode.Task[] = [];
    for (const pattern of this.provider.filePatterns) {
      const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 10);
      for (const file of files) {
        try {
          const content = fs.readFileSync(file.fsPath, 'utf-8');
          const targets = this.provider.parseTargets(content);
          for (const target of targets) {
            const command = this.provider.buildCommand(target, file.fsPath);
            const definition: vscode.TaskDefinition = {
              type: `scriptkit-${this.provider.id}`,
              target: target.name,
              file: file.fsPath,
            };
            const task = new vscode.Task(
              definition, vscode.TaskScope.Workspace,
              `${target.name} (${this.provider.displayName})`,
              'ScriptKit', new vscode.ShellExecution(command)
            );
            task.group = vscode.TaskGroup.Build;
            task.detail = `Run ${this.provider.displayName} ${target.kind}: ${target.name}`;
            tasks.push(task);
          }
        } catch { /* file may have been deleted */ }
      }
    }
    return tasks;
  }

  resolveTask(): vscode.Task | undefined { return undefined; }
}
