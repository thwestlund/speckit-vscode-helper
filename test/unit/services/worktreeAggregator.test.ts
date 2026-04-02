import * as assert from 'assert';
import { deduplicateFeatures, findGitRoot, sortGroups } from '../../../src/services/worktreeAggregator.js';
import { ExecFn, WorktreeInfo } from '../../../src/services/worktreeService.js';
import { FeatureGroup } from '../../../src/models/featureGroup.js';
import { Feature } from '../../../src/models/feature.js';
import { WorkflowState } from '../../../src/models/workflowState.js';
import { ArtifactType } from '../../../src/models/artifact.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeExec(stdout: string, err: Error | null = null): ExecFn {
  return (_cmd, _opts, cb) => cb(err, stdout, '');
}

function makeWorktree(p: string, branch: string | undefined, isCurrent: boolean): WorktreeInfo {
  return { path: p, branch, isCurrentWorkspace: isCurrent };
}

function makeFeature(number: string, state: WorkflowState, worktree: WorktreeInfo): Feature {
  return {
    number,
    shortName: `feature-${number}`,
    branchName: `${number}-feature-${number}`,
    directoryPath: `/repo/main/specs/${number}-feature-${number}`,
    state,
    artifacts: [
      {
        fileName: 'spec.md',
        filePath: `/repo/main/specs/${number}-feature-${number}/spec.md`,
        exists: true,
        artifactType: ArtifactType.Spec,
      },
    ],
    actionState: { needsAction: false, pendingActionLabel: undefined },
    worktreeSource: worktree,
  };
}

function makeGroup(worktree: WorktreeInfo, features: Feature[]): FeatureGroup {
  return { worktree, features };
}

// ─── findGitRoot ─────────────────────────────────────────────────────────────

suite('WorktreeAggregator — findGitRoot (US1)', () => {
  test('returns trimmed path when git succeeds', async () => {
    const result = await findGitRoot('/any/path', makeExec('/repo/main\n'));
    assert.strictEqual(result, '/repo/main');
  });

  test('returns undefined when git is unavailable', async () => {
    const error = new Error('git: command not found');
    const result = await findGitRoot('/any/path', makeExec('', error));
    assert.strictEqual(result, undefined);
  });

  test('returns undefined when exec returns an error with empty stdout', async () => {
    const error = new Error('not a git repository');
    const result = await findGitRoot('/not/a/repo', makeExec('', error));
    assert.strictEqual(result, undefined);
  });

  test('trims trailing whitespace from returned path', async () => {
    const result = await findGitRoot('/any/path', makeExec('  /repo/trimmed  \n'));
    assert.strictEqual(result, '/repo/trimmed');
  });
});

// ─── sortGroups ──────────────────────────────────────────────────────────────

suite('WorktreeAggregator — sortGroups (US1)', () => {
  const mainWorktree = makeWorktree('/repo/main', 'main', true);
  const remoteWorktree = makeWorktree('/repo/feature', '004-feature', false);

  test('preserves all features from all groups without deduplication', () => {
    const groups = [
      makeGroup(remoteWorktree, [makeFeature('003', WorkflowState.Specified, remoteWorktree)]),
      makeGroup(mainWorktree, [makeFeature('003', WorkflowState.Implementing, mainWorktree)]),
    ];
    const result = sortGroups(groups);
    const allFeatures = result.flatMap((g) => g.features);
    assert.strictEqual(allFeatures.length, 2, 'both copies of the feature must be kept');
  });

  test('current workspace group sorts first', () => {
    const anotherRemote = makeWorktree('/repo/another', 'aaa-branch', false);
    const groups = [
      makeGroup(remoteWorktree, [makeFeature('004', WorkflowState.New, remoteWorktree)]),
      makeGroup(mainWorktree, [makeFeature('001', WorkflowState.Specified, mainWorktree)]),
      makeGroup(anotherRemote, [makeFeature('005', WorkflowState.New, anotherRemote)]),
    ];
    const result = sortGroups(groups);
    assert.strictEqual(result[0].worktree.isCurrentWorkspace, true, 'current workspace must be first');
  });

  test('non-current worktrees sorted alphabetically by branch', () => {
    const anotherRemote = makeWorktree('/repo/another', 'aaa-branch', false);
    const groups = [
      makeGroup(remoteWorktree, [makeFeature('004', WorkflowState.New, remoteWorktree)]),
      makeGroup(mainWorktree, [makeFeature('001', WorkflowState.Specified, mainWorktree)]),
      makeGroup(anotherRemote, [makeFeature('005', WorkflowState.New, anotherRemote)]),
    ];
    const result = sortGroups(groups);
    // digits sort before letters in localeCompare (CLDR collation)
    assert.strictEqual(result[1].worktree.branch, '004-feature');
    assert.strictEqual(result[2].worktree.branch, 'aaa-branch');
  });

  test('returns empty array for empty input', () => {
    assert.deepStrictEqual(sortGroups([]), []);
  });
});

// ─── deduplicateFeatures ─────────────────────────────────────────────────────

/**
 * Like makeFeature but lets the caller set an explicit branchName, which is
 * what the deduplication algorithm keys on (branch-suffix vs branchName).
 */
function makeFeatNamed(branchName: string, worktree: WorktreeInfo): Feature {
  return {
    number: branchName.split('-')[0],
    shortName: branchName.split('-').slice(1).join('-'),
    branchName,
    directoryPath: `/repo/specs/${branchName}`,
    state: WorkflowState.Specified,
    artifacts: [],
    actionState: { needsAction: false, pendingActionLabel: undefined },
    worktreeSource: worktree,
  };
}

suite('WorktreeAggregator — deduplicateFeatures (US1, US4)', () => {
  const main = makeWorktree('/repo/main', 'main', true);
  // Branch name uses project-name-prefix convention; ends with the feature folder name
  const remoteMatch = makeWorktree(
    '/repo/wt-002',
    'vscode-speckit-extension-002-add-auth',
    false,
  );
  const remoteOther = makeWorktree('/repo/wt-003', 'vscode-speckit-extension-003-foo', false);

  test('feature with no duplicate is unaffected', () => {
    const groups = [
      makeGroup(main, [makeFeatNamed('001-setup', main)]),
      makeGroup(remoteMatch, [makeFeatNamed('002-add-auth', remoteMatch)]),
    ];
    const result = deduplicateFeatures(groups);
    const all = result.flatMap((g) => g.features.map((f) => f.branchName)).sort();
    assert.deepStrictEqual(all, ['001-setup', '002-add-auth']);
  });

  test('suffix-match branch wins over current-workspace for its own feature', () => {
    // Both main (current) and remoteMatch have 002-add-auth.
    // remoteMatch branch ends with "002-add-auth" → must win.
    const groups = [
      makeGroup(main, [makeFeatNamed('002-add-auth', main)]),
      makeGroup(remoteMatch, [makeFeatNamed('002-add-auth', remoteMatch)]),
    ];
    const result = deduplicateFeatures(groups);
    const winner = result.find((g) => g.features.some((f) => f.branchName === '002-add-auth'));
    assert.ok(winner, 'a winner group must exist');
    assert.strictEqual(winner.worktree.branch, 'vscode-speckit-extension-002-add-auth');
  });

  test('current-workspace wins over list-order when no suffix match', () => {
    // remoteNoSuffix appears first (list-order win), main is current workspace.
    // Neither has a suffix-match branch → current workspace must win.
    const remoteNoSuffix = makeWorktree('/repo/wt-other', 'unrelated-branch', false);
    const groups = [
      makeGroup(remoteNoSuffix, [makeFeatNamed('001-setup', remoteNoSuffix)]),
      makeGroup(main, [makeFeatNamed('001-setup', main)]),
    ];
    const result = deduplicateFeatures(groups);
    const winner = result.find((g) => g.features.some((f) => f.branchName === '001-setup'));
    assert.ok(winner);
    assert.strictEqual(winner.worktree.isCurrentWorkspace, true);
  });

  test('list-order wins when neither suffix-match nor current-workspace applies', () => {
    // Two remote worktrees, neither is current, neither has a suffix-match branch.
    const remote1 = makeWorktree('/repo/wt-a', 'alpha', false);
    const remote2 = makeWorktree('/repo/wt-b', 'beta', false);
    const groups = [
      makeGroup(remote1, [makeFeatNamed('003-foo', remote1)]),
      makeGroup(remote2, [makeFeatNamed('003-foo', remote2)]),
    ];
    const result = deduplicateFeatures(groups);
    const winner = result.find((g) => g.features.some((f) => f.branchName === '003-foo'));
    assert.ok(winner);
    assert.strictEqual(winner.worktree.branch, 'alpha', 'first in list wins');
  });

  test('three-worktree conflict resolves to single suffix-match winner', () => {
    const remote1 = makeWorktree('/repo/wt-1', 'unrelated-a', false);
    const remote2 = makeWorktree('/repo/wt-2', 'vscode-speckit-extension-002-add-auth', false);
    const remote3 = makeWorktree('/repo/wt-3', 'unrelated-b', false);
    const groups = [
      makeGroup(main, [makeFeatNamed('002-add-auth', main)]),
      makeGroup(remote1, [makeFeatNamed('002-add-auth', remote1)]),
      makeGroup(remote2, [makeFeatNamed('002-add-auth', remote2)]),
      makeGroup(remote3, [makeFeatNamed('002-add-auth', remote3)]),
    ];
    const result = deduplicateFeatures(groups);
    const ownerGroups = result.filter((g) =>
      g.features.some((f) => f.branchName === '002-add-auth'),
    );
    assert.strictEqual(ownerGroups.length, 1, '002-add-auth must appear in exactly one group');
    assert.strictEqual(
      ownerGroups[0].worktree.branch,
      'vscode-speckit-extension-002-add-auth',
    );
  });

  test('each branchName appears in at most one output group', () => {
    const groups = [
      makeGroup(main, [
        makeFeatNamed('001-setup', main),
        makeFeatNamed('002-add-auth', main),
      ]),
      makeGroup(remoteMatch, [
        makeFeatNamed('002-add-auth', remoteMatch),
        makeFeatNamed('003-foo', remoteMatch),
      ]),
      makeGroup(remoteOther, [
        makeFeatNamed('003-foo', remoteOther),
      ]),
    ];
    const result = deduplicateFeatures(groups);
    const all = result.flatMap((g) => g.features.map((f) => f.branchName));
    const unique = new Set(all);
    assert.strictEqual(all.length, unique.size, `Duplicates found: ${all.join(', ')}`);
  });

  test('loser group retains empty features array after dedup', () => {
    // remote1 has 002-add-auth but remoteMatch's branch suffix-matches it → remote1 loses
    const remote1 = makeWorktree('/repo/wt-x', 'some-branch', false);
    const groups = [
      makeGroup(remote1, [makeFeatNamed('002-add-auth', remote1)]),
      makeGroup(remoteMatch, [makeFeatNamed('002-add-auth', remoteMatch)]),
    ];
    const result = deduplicateFeatures(groups);
    const loser = result.find((g) => g.worktree.branch === 'some-branch');
    assert.ok(loser, 'loser group must still appear in output');
    assert.strictEqual(loser.features.length, 0);
  });
});
