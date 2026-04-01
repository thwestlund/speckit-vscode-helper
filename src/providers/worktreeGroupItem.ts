import * as path from 'path';
import * as vscode from 'vscode';
import { FeatureGroup } from '../models/featureGroup.js';

export class WorktreeGroupItem extends vscode.TreeItem {
  constructor(readonly group: FeatureGroup) {
    const { worktree } = group;
    const label = worktree.branch ?? `${path.basename(worktree.path)} (detached)`;
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.description = worktree.isCurrentWorkspace ? '(current)' : undefined;
    this.iconPath = new vscode.ThemeIcon(worktree.isCurrentWorkspace ? 'home' : 'source-control');
    this.contextValue = 'worktreeGroup';
  }
}
