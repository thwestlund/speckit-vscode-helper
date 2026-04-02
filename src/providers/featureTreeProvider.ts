import * as path from 'path';
import * as vscode from 'vscode';
import { Feature } from '../models/feature.js';
import { FeatureGroup } from '../models/featureGroup.js';
import { FeatureTreeItem, ArtifactTreeItem } from './featureTreeItem.js';
import { WorktreeGroupItem } from './worktreeGroupItem.js';
import { discoverFeatures } from '../services/specDiscovery.js';
import { aggregateFeatures } from '../services/worktreeAggregator.js';
import { CONTEXT_KEYS } from '../constants.js';
import { WorktreeInfo } from '../services/worktreeService.js';

type TreeElement = FeatureTreeItem | ArtifactTreeItem | WorktreeGroupItem;

export class FeatureTreeProvider implements vscode.TreeDataProvider<TreeElement>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    TreeElement | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _groups: FeatureGroup[] = [];

  constructor(
    private readonly _specsDir: vscode.Uri,
    private readonly _gitRoot?: string,
  ) {}

  getTreeItem(element: TreeElement): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeElement): Promise<TreeElement[]> {
    if (!element) {
      // Always render as grouped — one WorktreeGroupItem per worktree
      return this._groups.map((g) => new WorktreeGroupItem(g));
    }
    if (element instanceof WorktreeGroupItem) {
      if (element.group.features.length === 0) {
        const placeholder = new vscode.TreeItem(
          '(no features)',
          vscode.TreeItemCollapsibleState.None,
        );
        placeholder.contextValue = 'noFeatures';
        return [placeholder as unknown as TreeElement];
      }
      return element.group.features.map((f) => new FeatureTreeItem(f));
    }
    if (element instanceof FeatureTreeItem) {
      return element.feature.artifacts
        .filter((a) => a.exists)
        .map((a) => new ArtifactTreeItem(a));
    }
    return [];
  }

  async refresh(): Promise<void> {
    const workspaceRoot = path.dirname(this._specsDir.fsPath);

    if (this._gitRoot) {
      try {
        const groups = await aggregateFeatures(this._gitRoot, workspaceRoot);
        this._groups = groups.map((g) => ({ ...g, features: sortFeatures(g.features) }));
      } catch {
        this._groups = await this._singleWorktreeFallback(workspaceRoot);
      }
    } else {
      this._groups = await this._singleWorktreeFallback(workspaceRoot);
    }

    await vscode.commands.executeCommand(
      'setContext',
      CONTEXT_KEYS.noFeatures,
      this._groups.flatMap((g) => g.features).length === 0,
    );
    this._onDidChangeTreeData.fire(undefined);
  }

  private async _singleWorktreeFallback(workspaceRoot: string): Promise<FeatureGroup[]> {
    try {
      const currentWorktree: WorktreeInfo = {
        path: workspaceRoot,
        branch: undefined,
        isCurrentWorkspace: true,
      };
      const discovered = await discoverFeatures(this._specsDir, currentWorktree);
      return [{ worktree: currentWorktree, features: sortFeatures(discovered) }];
    } catch {
      return [];
    }
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}

function sortFeatures(features: Feature[]): Feature[] {
  return [...features].sort((a, b) => {
    const aNeeds = a.actionState.needsAction ? 0 : 1;
    const bNeeds = b.actionState.needsAction ? 0 : 1;
    if (aNeeds !== bNeeds) {
      return aNeeds - bNeeds;
    }
    return naturalCompare(a.branchName, b.branchName);
  });
}

function naturalCompare(a: string, b: string): number {
  const numA = extractNumericPrefix(a);
  const numB = extractNumericPrefix(b);
  const diff = numA - numB;
  return diff !== 0 ? diff : a.localeCompare(b);
}

function extractNumericPrefix(name: string): number {
  const match = /^(\d+)/.exec(name);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}
