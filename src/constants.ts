import * as vscode from 'vscode';
import { ArtifactType } from './models/artifact.js';
import { WorkflowState } from './models/workflowState.js';

export const ARTIFACT_FILES: ReadonlyMap<string, ArtifactType> = new Map([
  ['spec.md', ArtifactType.Spec],
  ['plan.md', ArtifactType.Plan],
  ['research.md', ArtifactType.Research],
  ['data-model.md', ArtifactType.DataModel],
  ['contracts', ArtifactType.Contracts],
  ['quickstart.md', ArtifactType.Quickstart],
  ['tasks.md', ArtifactType.Tasks],
  ['checklists', ArtifactType.Checklist],
]);

export const STATE_ICONS: ReadonlyMap<WorkflowState, vscode.ThemeIcon> = new Map([
  [WorkflowState.New, new vscode.ThemeIcon('file-directory')],
  [WorkflowState.Specified, new vscode.ThemeIcon('file-text')],
  [WorkflowState.Planned, new vscode.ThemeIcon('checklist')],
  [WorkflowState.TasksDefined, new vscode.ThemeIcon('tasklist')],
  [
    WorkflowState.Implementing,
    new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.yellow')),
  ],
  [
    WorkflowState.Complete,
    new vscode.ThemeIcon('check-all', new vscode.ThemeColor('charts.green')),
  ],
  [
    WorkflowState.Unknown,
    new vscode.ThemeIcon('question', new vscode.ThemeColor('charts.orange')),
  ],
]);

export const COMMAND_IDS = {
  refreshTree: 'speckit.refreshTree',
  specifyFeature: 'speckit.specifyFeature',
  planFeature: 'speckit.planFeature',
  generateTasks: 'speckit.generateTasks',
  implementFeature: 'speckit.implementFeature',
  clarifyFeature: 'speckit.clarifyFeature',
  analyzeFeature: 'speckit.analyzeFeature',
  createChecklist: 'speckit.createChecklist',
  syncExtension: 'speckit.syncExtension',
  openArtifact: 'speckit.openArtifact',
} as const;

export const SETTING_KEYS = {
  aiAgent: 'speckit.aiAgent',
} as const;

export const CONTEXT_KEYS = {
  active: 'speckit.active',
  noFeatures: 'speckit.noFeatures',
} as const;
