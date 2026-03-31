import * as vscode from 'vscode';
import { COMMAND_IDS, CONTEXT_KEYS } from './constants.js';
import { FeatureTreeProvider } from './providers/featureTreeProvider.js';
import { FeatureTreeItem, ArtifactTreeItem } from './providers/featureTreeItem.js';
import { FileWatcher } from './services/fileWatcher.js';
import { launchPrompt } from './services/promptLauncher.js';
import { registerAgent } from './agents/agentRegistry.js';
import { CopilotAgent } from './agents/copilotAgent.js';
import { ClaudeAgent } from './agents/claudeAgent.js';

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

  // US1: Feature tree view
  const treeProvider = new FeatureTreeProvider(specsDir);
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
      void launchPrompt('clarify', item?.feature, workspaceRoot, true);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.analyzeFeature, (item?: FeatureTreeItem) => {
      void launchPrompt('analyze', item?.feature, workspaceRoot, true);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.createChecklist, (item?: FeatureTreeItem) => {
      void launchPrompt('checklist', item?.feature, workspaceRoot);
    }),
  );

  // US3: Open artifact command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.openArtifact, (item?: ArtifactTreeItem) => {
      if (item?.artifact?.filePath) {
        void vscode.window.showTextDocument(vscode.Uri.file(item.artifact.filePath));
      }
    }),
  );

  // US6: Sync extension command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.syncExtension, () => {
      void syncExtension(workspaceRoot);
    }),
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
