import * as vscode from 'vscode';

export function debounce(fn: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      fn();
    }, delayMs);
  };
}

export class FileWatcher {
  static createSpecsWatcher(specsDir: vscode.Uri, onChanged: () => void): vscode.Disposable {
    const debouncedCallback = debounce(onChanged, 150);
    const pattern = new vscode.RelativePattern(specsDir, '**/*');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    return vscode.Disposable.from(
      watcher.onDidCreate(debouncedCallback),
      watcher.onDidChange(debouncedCallback),
      watcher.onDidDelete(debouncedCallback),
      watcher,
    );
  }

  static createProjectWatcher(workspaceRoot: vscode.Uri, onChanged: () => void): vscode.Disposable {
    const debouncedCallback = debounce(onChanged, 150);
    const patterns = [
      new vscode.RelativePattern(workspaceRoot, '.specify/templates/**'),
      new vscode.RelativePattern(workspaceRoot, '.specify/scripts/**'),
      new vscode.RelativePattern(workspaceRoot, '.github/prompts/**'),
    ];

    const disposables = patterns.flatMap((pattern) => {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      return [
        watcher.onDidCreate(debouncedCallback),
        watcher.onDidChange(debouncedCallback),
        watcher.onDidDelete(debouncedCallback),
        watcher,
      ];
    });

    return vscode.Disposable.from(...disposables);
  }
}
