import { WorkflowState } from './workflowState.js';
import { Artifact } from './artifact.js';

export interface Feature {
  readonly number: string;
  readonly shortName: string;
  readonly branchName: string;
  readonly directoryPath: string;
  readonly state: WorkflowState;
  readonly artifacts: Artifact[];
}

export function parseFeatureDirectory(dirName: string): { number: string; shortName: string } {
  // Matches: "001-name" or "20260319-143022-name"
  const match = /^(\d+(?:-\d+)?)-(.+)$/.exec(dirName);
  if (match) {
    return { number: match[1], shortName: match[2] };
  }
  return { number: dirName, shortName: dirName };
}
