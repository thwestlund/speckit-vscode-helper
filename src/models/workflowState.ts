import { Artifact, ArtifactType } from './artifact.js';

export enum WorkflowState {
  New = 'new',
  Specified = 'specified',
  Planned = 'planned',
  TasksDefined = 'tasksDefined',
  Implementing = 'implementing',
  Complete = 'complete',
  Unknown = 'unknown',
}

export const STATE_ORDER: WorkflowState[] = [
  WorkflowState.New,
  WorkflowState.Specified,
  WorkflowState.Planned,
  WorkflowState.TasksDefined,
  WorkflowState.Implementing,
  WorkflowState.Complete,
];

export function deriveState(artifacts: Artifact[], tasksContent?: string): WorkflowState {
  const byType = new Map(artifacts.map((a) => [a.artifactType, a]));

  const tasksArtifact = byType.get(ArtifactType.Tasks);
  if (tasksArtifact?.exists) {
    if (tasksContent !== undefined) {
      return deriveTasksState(tasksContent);
    }
    return WorkflowState.TasksDefined;
  }

  if (byType.get(ArtifactType.Plan)?.exists) {
    return WorkflowState.Planned;
  }

  if (byType.get(ArtifactType.Spec)?.exists) {
    return WorkflowState.Specified;
  }

  return WorkflowState.New;
}

function deriveTasksState(content: string): WorkflowState {
  const incomplete = (content.match(/- \[ \]/g) ?? []).length;
  const complete = (content.match(/- \[x\]/gi) ?? []).length;
  const total = incomplete + complete;

  if (total === 0) {
    return WorkflowState.TasksDefined;
  }
  if (complete === total) {
    return WorkflowState.Complete;
  }
  if (complete > 0) {
    return WorkflowState.Implementing;
  }
  return WorkflowState.TasksDefined;
}
