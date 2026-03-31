export enum ArtifactType {
  Spec = 'spec',
  Plan = 'plan',
  Research = 'research',
  DataModel = 'dataModel',
  Contracts = 'contracts',
  Quickstart = 'quickstart',
  Tasks = 'tasks',
  Checklist = 'checklist',
}

export interface Artifact {
  readonly fileName: string;
  readonly filePath: string;
  readonly exists: boolean;
  readonly artifactType: ArtifactType;
}
