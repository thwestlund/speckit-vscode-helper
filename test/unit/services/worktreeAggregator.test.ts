import * as assert from 'assert';
import { findGitRoot, deduplicateByNumber } from '../../../src/services/worktreeAggregator.js';
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

// ─── deduplicateByNumber ──────────────────────────────────────────────────────

suite('WorktreeAggregator — deduplicateByNumber (US1, US6)', () => {
  const mainWorktree = makeWorktree('/repo/main', 'main', true);
  const remoteWorktree = makeWorktree('/repo/feature', '004-feature', false);

  test('returns all features when no duplicates', () => {
    const groups = [
      makeGroup(mainWorktree, [
        makeFeature('001', WorkflowState.Specified, mainWorktree),
        makeFeature('002', WorkflowState.Planned, mainWorktree),
      ]),
    ];
    const result = deduplicateByNumber(groups);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].features.length, 2);
  });

  test('keeps higher-state entry when same number in two groups', () => {
    const groups = [
      makeGroup(mainWorktree, [makeFeature('003', WorkflowState.Specified, mainWorktree)]),
      makeGroup(remoteWorktree, [makeFeature('003', WorkflowState.Implementing, remoteWorktree)]),
    ];
    const result = deduplicateByNumber(groups);
    const allFeatures = result.flatMap((g) => g.features);
    assert.strictEqual(allFeatures.length, 1, 'should deduplicate to one entry');
    assert.strictEqual(
      allFeatures[0].state,
      WorkflowState.Implementing,
      'should keep the higher-state entry',
    );
    assert.strictEqual(
      allFeatures[0].worktreeSource.path,
      remoteWorktree.path,
      'winner should be from remote worktree',
    );
  });

  test('keeps current workspace entry on equal state (tie-break)', () => {
    const groups = [
      makeGroup(mainWorktree, [makeFeature('003', WorkflowState.Planned, mainWorktree)]),
      makeGroup(remoteWorktree, [makeFeature('003', WorkflowState.Planned, remoteWorktree)]),
    ];
    const result = deduplicateByNumber(groups);
    const allFeatures = result.flatMap((g) => g.features);
    assert.strictEqual(allFeatures.length, 1);
    assert.strictEqual(allFeatures[0].worktreeSource.isCurrentWorkspace, true);
  });

  test('removes empty groups after deduplication', () => {
    const groups = [
      makeGroup(mainWorktree, [makeFeature('001', WorkflowState.Complete, mainWorktree)]),
      makeGroup(remoteWorktree, [makeFeature('001', WorkflowState.Specified, remoteWorktree)]),
    ];
    const result = deduplicateByNumber(groups);
    // remote group should be empty and removed
    assert.ok(
      result.every((g) => g.features.length > 0),
      'no empty groups should remain',
    );
  });

  test('current workspace group sorts first', () => {
    const anotherRemote = makeWorktree('/repo/another', 'aaa-branch', false);
    const groups = [
      makeGroup(remoteWorktree, [makeFeature('004', WorkflowState.New, remoteWorktree)]),
      makeGroup(mainWorktree, [makeFeature('001', WorkflowState.Specified, mainWorktree)]),
      makeGroup(anotherRemote, [makeFeature('005', WorkflowState.New, anotherRemote)]),
    ];
    const result = deduplicateByNumber(groups);
    assert.strictEqual(result[0].worktree.isCurrentWorkspace, true, 'current workspace must be first');
  });

  test('returns empty array for empty input', () => {
    assert.deepStrictEqual(deduplicateByNumber([]), []);
  });
});
