import { WorktreeInfo } from '../services/worktreeService.js';
import { Feature } from './feature.js';

export interface FeatureGroup {
  readonly worktree: WorktreeInfo;
  readonly features: Feature[];
}
