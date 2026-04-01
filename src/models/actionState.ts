import { WorkflowState } from './workflowState.js';

export interface ActionState {
  readonly needsAction: boolean;
  readonly pendingActionLabel: string | undefined;
}

export const ACTION_MESSAGES: ReadonlyMap<WorkflowState, string | undefined> = new Map([
  [WorkflowState.New, 'Next step: Specify this feature'],
  [WorkflowState.Specified, 'Next step: Create a plan'],
  [WorkflowState.Planned, 'Next step: Generate tasks'],
  [WorkflowState.TasksDefined, 'Next step: Start implementation'],
  [WorkflowState.Implementing, undefined],
  [WorkflowState.Complete, undefined],
  [WorkflowState.Unknown, undefined],
]);

export function deriveActionState(state: WorkflowState): ActionState {
  const pendingActionLabel = ACTION_MESSAGES.get(state);
  return {
    needsAction: pendingActionLabel !== undefined,
    pendingActionLabel,
  };
}
