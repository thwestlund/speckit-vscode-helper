import * as vscode from 'vscode';
import * as path from 'path';
import { COMMAND_IDS, CONTEXT_KEYS, CHAT_SKELETON } from './constants.js';
import { FeatureTreeProvider } from './providers/featureTreeProvider.js';
import { FeatureTreeItem, ArtifactTreeItem } from './providers/featureTreeItem.js';
import { FileWatcher } from './services/fileWatcher.js';
import { launchPrompt } from './services/promptLauncher.js';
import { registerAgent } from './agents/agentRegistry.js';
import { CopilotAgent } from './agents/copilotAgent.js';
import { ClaudeAgent } from './agents/claudeAgent.js';
import { listWorktrees, addWorktree } from './services/worktreeService.js';
import { findGitRoot } from './services/worktreeAggregator.js';

let outputChannel: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const startTime = performance.now();

  outputChannel = vscode.window.createOutputChannel('SpecKit');
  context.subscriptions.push(outputChannel);

  // Register AI agents
  registerAgent(new CopilotAgent());
  registerAgent(new ClaudeAgent());

  // Locate .specify/ root (supports multi-root workspaces)
  const specifyRoot = await findSpecifyRoot();
  if (!specifyRoot) {
    return;
  }

  await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.active, true);

  const workspaceRoot = vscode.Uri.joinPath(specifyRoot, '..');
  const specsDir = vscode.Uri.joinPath(workspaceRoot, 'specs');
  const gitRoot = await findGitRoot(workspaceRoot.fsPath);

  // US1: Feature tree view
  const treeProvider = new FeatureTreeProvider(specsDir, gitRoot);
  context.subscriptions.push(treeProvider);
  context.subscriptions.push(
    vscode.window.createTreeView('speckit.featureTree', { treeDataProvider: treeProvider }),
  );
  await treeProvider.refresh();

  // US2: Live watching of specs/
  const specsWatcher = FileWatcher.createSpecsWatcher(specsDir, () => {
    void treeProvider.refresh();
  });
  context.subscriptions.push(specsWatcher);

  // US6: Project file watching for sync notification
  const projectWatcher = FileWatcher.createProjectWatcher(workspaceRoot, () => {
    void showSyncNotification();
  });
  context.subscriptions.push(projectWatcher);

  // US1: Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.refreshTree, () => {
      void treeProvider.refresh();
    }),
  );

  // US3: Workflow prompt commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.specifyFeature, (item?: FeatureTreeItem) => {
      void launchPrompt('specify', item?.feature, workspaceRoot);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.planFeature, (item?: FeatureTreeItem) => {
      void launchPrompt('plan', item?.feature, workspaceRoot);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.generateTasks, (item?: FeatureTreeItem) => {
      void launchPrompt('tasks', item?.feature, workspaceRoot);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.implementFeature, (item?: FeatureTreeItem) => {
      void launchPrompt('implement', item?.feature, workspaceRoot);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.clarifyFeature, (item?: FeatureTreeItem) => {
      void launchPrompt('clarify', item?.feature, workspaceRoot);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.analyzeFeature, (item?: FeatureTreeItem) => {
      void launchPrompt('analyze', item?.feature, workspaceRoot);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.createChecklist, (item?: FeatureTreeItem) => {
      void launchPrompt('checklist', item?.feature, workspaceRoot);
    }),
  );

  // US3: Open artifact command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.openArtifact, (item?: ArtifactTreeItem) => {
      if (item?.artifact?.filePath) {
        vscode.window.showTextDocument(vscode.Uri.file(item.artifact.filePath)).then(
          () => {},
          (err: unknown) => {
            void vscode.window.showErrorMessage(
              `SpecKit: Could not open file — ${err instanceof Error ? err.message : String(err)}`,
            );
          },
        );
      }
    }),
  );

  // US6: Sync extension command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.syncExtension, () => {
      void syncExtension(workspaceRoot);
    }),
  );

  // US2 (002): Open feature in new chat with skeleton template
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.openFeatureInChat, () => {
      void vscode.commands.executeCommand('workbench.action.chat.open', {
        query: CHAT_SKELETON,
        isPartialQuery: true,
        newSession: true,
      });
    }),
  );

  // US3 (002): Start feature in a new or existing git worktree
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_IDS.startInWorktree,
      (item?: FeatureTreeItem) => {
        void startInWorktree(item, workspaceRoot);
      },
    ),
  );

  const elapsed = performance.now() - startTime;
  if (elapsed > 500) {
    outputChannel.appendLine(
      `Warning: Activation took ${elapsed.toFixed(0)} ms (exceeds 500 ms target)`,
    );
  }
}

export function deactivate(): void {
  // Disposables are cleaned up via context.subscriptions
}

async function findSpecifyRoot(): Promise<vscode.Uri | undefined> {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const found = await searchForSpecify(folder.uri);
    if (found) {
      return found;
    }
  }
  return undefined;
}

async function searchForSpecify(baseUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  const candidate = vscode.Uri.joinPath(baseUri, '.specify', 'init-options.json');
  try {
    await vscode.workspace.fs.stat(candidate);
    return vscode.Uri.joinPath(baseUri, '.specify');
  } catch {
    return undefined;
  }
}

async function showSyncNotification(): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    'SpecKit project files changed. Sync extension?',
    'Sync Now',
    'Dismiss',
  );
  if (action === 'Sync Now') {
    await vscode.commands.executeCommand(COMMAND_IDS.syncExtension);
  }
}

async function startInWorktree(
  item: FeatureTreeItem | undefined,
  workspaceRoot: vscode.Uri,
): Promise<void> {
  const gitRoot = workspaceRoot.fsPath;
  const choice = await vscode.window.showQuickPick(['New Worktree', 'Existing Worktree'], {
    title: 'Start in Worktree',
    placeHolder: 'Choose worktree type',
  });
  if (!choice) {
    return;
  }

  try {
    if (choice === 'New Worktree') {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select parent folder for new worktree',
        openLabel: 'Select Folder',
      });
      if (!uris || uris.length === 0) {
        return;
      }
      const branchName = item?.feature.branchName ?? 'new-worktree';
      const targetPath = path.join(uris[0].fsPath, branchName);
      await addWorktree(branchName, targetPath, gitRoot);
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetPath), {
        forceNewWindow: true,
      });
    } else {
      const worktrees = await listWorktrees(gitRoot);
      const candidates = worktrees.filter((w) => !w.isCurrentWorkspace);
      if (candidates.length === 0) {
        await vscode.window.showInformationMessage('No other worktrees found.');
        return;
      }
      const selected = await vscode.window.showQuickPick(
        candidates.map((w) => ({
          label: w.branch ?? path.basename(w.path),
          description: w.path,
          worktree: w,
        })),
        { title: 'Select existing worktree to open' },
      );
      if (!selected) {
        return;
      }
      await vscode.commands.executeCommand(
        'vscode.openFolder',
        vscode.Uri.file(selected.worktree.path),
        { forceNewWindow: true },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Worktree operation failed: ${message}`);
  }
}

async function syncExtension(workspaceRoot: vscode.Uri): Promise<void> {
  const promptsDir = vscode.Uri.joinPath(workspaceRoot, '.github', 'prompts');
  let promptFiles: [string, vscode.FileType][] = [];
  try {
    promptFiles = await vscode.workspace.fs.readDirectory(promptsDir);
  } catch {
    // No .github/prompts directory — not an error
  }

  const specKitPrompts = promptFiles
    .filter(([name]) => name.startsWith('speckit.') && name.endsWith('.prompt.md'))
    .map(([name]) => name);

  const message =
    specKitPrompts.length > 0
      ? `Found ${specKitPrompts.length} SpecKit prompt file(s). Configuration is up to date.`
      : 'No SpecKit prompt files found in .github/prompts/';

  void vscode.window.showInformationMessage(message);
}
