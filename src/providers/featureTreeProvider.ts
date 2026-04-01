import * as vscode from 'vscode';
import { Feature } from '../models/feature.js';
import { FeatureTreeItem, ArtifactTreeItem } from './featureTreeItem.js';
import { discoverFeatures } from '../services/specDiscovery.js';
import { CONTEXT_KEYS } from '../constants.js';

type TreeElement = FeatureTreeItem | ArtifactTreeItem;

export class FeatureTreeProvider implements vscode.TreeDataProvider<TreeElement>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    TreeElement | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _features: Feature[] = [];

  constructor(private readonly _specsDir: vscode.Uri) {}

  getTreeItem(element: TreeElement): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeElement): Promise<TreeElement[]> {
    if (!element) {
      return this._features.map((f) => new FeatureTreeItem(f));
    }
    if (element instanceof FeatureTreeItem) {
      return element.feature.artifacts
        .filter((a) => a.exists)
        .map((a) => new ArtifactTreeItem(a));
    }
    return [];
  }

  async refresh(): Promise<void> {
    try {
      const discovered = await discoverFeatures(this._specsDir);
      this._features = sortFeatures(discovered);
    } catch {
      this._features = [];
    }

    await vscode.commands.executeCommand(
      'setContext',
      CONTEXT_KEYS.noFeatures,
      this._features.length === 0,
    );
    this._onDidChangeTreeData.fire(undefined);
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
