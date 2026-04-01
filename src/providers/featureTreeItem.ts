import * as vscode from 'vscode';
import { Feature } from '../models/feature.js';
import { Artifact } from '../models/artifact.js';
import { WorkflowState } from '../models/workflowState.js';
import { STATE_ICONS, COMMAND_IDS } from '../constants.js';

const STATE_LABELS: Record<WorkflowState, string> = {
  [WorkflowState.New]: 'New',
  [WorkflowState.Specified]: 'Specified',
  [WorkflowState.Planned]: 'Planned',
  [WorkflowState.TasksDefined]: 'Tasks Defined',
  [WorkflowState.Implementing]: 'Implementing',
  [WorkflowState.Complete]: 'Complete',
  [WorkflowState.Unknown]: 'Unknown',
};

export class FeatureTreeItem extends vscode.TreeItem {
  constructor(readonly feature: Feature) {
    const label =
      feature.number !== feature.shortName
        ? `${feature.number} ${feature.shortName}`
        : feature.shortName;
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = STATE_LABELS[feature.state];
    this.contextValue = `feature.${feature.state}`;

    if (feature.actionState.needsAction) {
      this.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('list.warningForeground'),
      );
      const baseText = `${feature.branchName} (${STATE_LABELS[feature.state]})`;
      const md = new vscode.MarkdownString(
        `${baseText}\n\n${feature.actionState.pendingActionLabel}`,
      );
      this.tooltip = md;
    } else {
      this.iconPath = STATE_ICONS.get(feature.state);
      this.tooltip = `${feature.branchName} (${STATE_LABELS[feature.state]})`;
    }
  }
}

export class ArtifactTreeItem extends vscode.TreeItem {
  constructor(readonly artifact: Artifact) {
    super(artifact.fileName);
    this.contextValue = `artifact.${artifact.artifactType}`;

    if (artifact.exists) {
      this.iconPath = new vscode.ThemeIcon('file');
      this.command = {
        command: COMMAND_IDS.openArtifact,
        title: 'Open Artifact',
        arguments: [this],
      };
    } else {
      this.iconPath = new vscode.ThemeIcon('file', new vscode.ThemeColor('disabledForeground'));
      this.description = '(missing)';
    }

    this.tooltip = artifact.filePath;
  }
}
