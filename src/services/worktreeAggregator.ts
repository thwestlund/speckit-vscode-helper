import * as childProcess from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { FeatureGroup } from '../models/featureGroup.js';
import { STATE_ORDER, WorkflowState } from '../models/workflowState.js';
import { discoverFeatures } from './specDiscovery.js';
import { ExecFn, listWorktrees, WorktreeInfo } from './worktreeService.js';

const MAX_WORKTREES = 20;
let _warnedOverLimit = false;

export async function findGitRoot(
  workspaceRoot: string,
  execFn: ExecFn = childProcess.exec,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFn('git rev-parse --show-toplevel', { cwd: workspaceRoot }, (err, stdout) => {
      if (err) {
        resolve(undefined);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export async function aggregateFeatures(
  gitRoot: string,
  currentWorkspaceRoot: string,
  execFn?: ExecFn,
): Promise<FeatureGroup[]> {
  let worktrees: WorktreeInfo[];
  try {
    worktrees = await listWorktrees(gitRoot, execFn);
  } catch {
    worktrees = [];
  }

  if (worktrees.length === 0) {
    // git unavailable or no worktrees — fall back to current workspace only
    const currentWorktree: WorktreeInfo = {
      path: currentWorkspaceRoot,
      branch: undefined,
      isCurrentWorkspace: true,
    };
    try {
      const specsUri = vscode.Uri.file(path.join(currentWorkspaceRoot, 'specs'));
      const features = await discoverFeatures(specsUri, currentWorktree);
      return features.length > 0 ? [{ worktree: currentWorktree, features }] : [];
    } catch {
      return [];
    }
  }

  if (worktrees.length > MAX_WORKTREES) {
    if (!_warnedOverLimit) {
      _warnedOverLimit = true;
      void vscode.window.showWarningMessage(
        `SpecKit: ${worktrees.length} worktrees detected. Only the first ${MAX_WORKTREES} will be scanned.`,
      );
    }
    worktrees = worktrees.slice(0, MAX_WORKTREES);
  }

  const groupResults = await Promise.all(
    worktrees.map(async (worktree) => {
      try {
        const specsUri = vscode.Uri.file(path.join(worktree.path, 'specs'));
        const features = await discoverFeatures(specsUri, worktree);
        return { worktree, features };
      } catch {
        return { worktree, features: [] };
      }
    }),
  );

  const nonEmpty = groupResults.filter((g) => g.features.length > 0);
  return deduplicateByNumber(nonEmpty);
}

export function deduplicateByNumber(groups: FeatureGroup[]): FeatureGroup[] {
  // Build a map: numeric prefix → winning Feature (highest state, current workspace wins ties)
  const winner = new Map<string, { groupIndex: number; featureIndex: number; stateRank: number }>();

  groups.forEach((group, gi) => {
    group.features.forEach((feature, fi) => {
      const stateRank = stateToRank(feature.state);
      const existing = winner.get(feature.number);
      if (!existing) {
        winner.set(feature.number, { groupIndex: gi, featureIndex: fi, stateRank });
      } else if (
        stateRank > existing.stateRank ||
        (stateRank === existing.stateRank && group.worktree.isCurrentWorkspace)
      ) {
        winner.set(feature.number, { groupIndex: gi, featureIndex: fi, stateRank });
      }
    });
  });

  // Rebuild groups keeping only winner features
  const winnerNumbers = new Set(
    [...winner.entries()].map(([num, { groupIndex, featureIndex }]) => {
      const key = `${groupIndex}:${featureIndex}`;
      return key;
    }),
  );
  // Build set of (groupIndex, featureIndex) pairs that are winners
  const winnerKeys = new Set<string>();
  for (const { groupIndex, featureIndex } of winner.values()) {
    winnerKeys.add(`${groupIndex}:${featureIndex}`);
  }

  const deduped: FeatureGroup[] = groups
    .map((group, gi) => ({
      worktree: group.worktree,
      features: group.features.filter((_, fi) => winnerKeys.has(`${gi}:${fi}`)),
    }))
    .filter((g) => g.features.length > 0);

  // Sort: current workspace first, then alphabetical by branch
  return deduped.sort((a, b) => {
    if (a.worktree.isCurrentWorkspace) {
      return -1;
    }
    if (b.worktree.isCurrentWorkspace) {
      return 1;
    }
    return (a.worktree.branch ?? a.worktree.path).localeCompare(
      b.worktree.branch ?? b.worktree.path,
    );
  });
}

function stateToRank(state: WorkflowState): number {
  const idx = STATE_ORDER.indexOf(state);
  return idx === -1 ? -1 : idx;
}
