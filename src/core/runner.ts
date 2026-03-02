import * as vscode from 'vscode';

export class ScriptRunner {
  private terminals: Map<string, vscode.Terminal> = new Map();

  run(providerId: string, command: string, cwd?: string): void {
    let terminal = this.terminals.get(providerId);
    if (terminal && terminal.exitStatus !== undefined) {
      this.terminals.delete(providerId);
      terminal = undefined;
    }
    if (!terminal) {
      terminal = vscode.window.createTerminal({ name: `ScriptKit: ${providerId}`, cwd });
      this.terminals.set(providerId, terminal);
    }
    terminal.show();
    terminal.sendText(command);
  }

  dispose(): void {
    for (const terminal of this.terminals.values()) {
      terminal.dispose();
    }
    this.terminals.clear();
  }
}
