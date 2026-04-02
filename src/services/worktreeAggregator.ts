import * as childProcess from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { FeatureGroup } from '../models/featureGroup.js';
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
      const specsUri = vscode.Uri.file(path.join(worktree.path, 'specs'));
      try {
        const features = await discoverFeatures(specsUri, worktree);
        return { worktree, features, accessible: true };
      } catch {
        return { worktree, features: [], accessible: false };
      }
    }),
  );

  // Retain groups whose specs/ directory was accessible (even if dedup empties them);
  // omit groups whose directory was not accessible on disk.
  const accessible = groupResults.filter((g) => g.accessible);
  const deduped = deduplicateFeatures(accessible);
  return sortGroups(deduped);
}

/**
 * Assigns each feature to exactly one home worktree using a three-tier priority chain:
 * 1. Suffix-match (strongest): the worktree whose branch ends with `-{featureFolderName}`
 *    or equals `{featureFolderName}` (convention: `{project}-{number}-{name}`).
 * 2. Current workspace: wins over list-order when no suffix match exists.
 * 3. List order (weakest): first occurrence in the input array.
 */
export function deduplicateFeatures(groups: FeatureGroup[]): FeatureGroup[] {
  // owner: featureFolderName → winning group index
  const owner = new Map<string, number>();

  // Pass 1 — list order (weakest): first occurrence wins
  for (let i = 0; i < groups.length; i++) {
    for (const f of groups[i].features) {
      if (!owner.has(f.branchName)) {
        owner.set(f.branchName, i);
      }
    }
  }

  // Pass 2 — current workspace overrides non-suffix-matched list-order winners
  const currentIdx = groups.findIndex((g) => g.worktree.isCurrentWorkspace);
  if (currentIdx >= 0) {
    for (const f of groups[currentIdx].features) {
      const winnerIdx = owner.get(f.branchName);
      if (winnerIdx === undefined || winnerIdx === currentIdx) {
        continue;
      }
      const winnerBranch = groups[winnerIdx].worktree.branch;
      const winnerHasSuffix =
        winnerBranch === f.branchName || (winnerBranch?.endsWith('-' + f.branchName) ?? false);
      if (!winnerHasSuffix) {
        owner.set(f.branchName, currentIdx);
      }
    }
  }

  // Pass 3 — suffix-match (strongest): always overrides any prior assignment
  for (let i = 0; i < groups.length; i++) {
    const branch = groups[i].worktree.branch;
    if (!branch) {
      continue;
    }
    for (const f of groups[i].features) {
      if (branch === f.branchName || branch.endsWith('-' + f.branchName)) {
        owner.set(f.branchName, i);
      }
    }
  }

  return groups.map((g, i) => ({
    ...g,
    features: g.features.filter((f) => owner.get(f.branchName) === i),
  }));
}

export function sortGroups(groups: FeatureGroup[]): FeatureGroup[] {
  // Sort: current workspace first, then alphabetical by branch
  return [...groups].sort((a, b) => {
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
