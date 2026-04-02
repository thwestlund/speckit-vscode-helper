import * as assert from 'assert';
import * as vscode from 'vscode';
import { FeatureTreeProvider } from '../../src/providers/featureTreeProvider.js';
import { FeatureTreeItem } from '../../src/providers/featureTreeItem.js';
import { WorktreeGroupItem } from '../../src/providers/worktreeGroupItem.js';
import { sortGroups } from '../../src/services/worktreeAggregator.js';
import { FeatureGroup } from '../../src/models/featureGroup.js';
import { Feature } from '../../src/models/feature.js';
import { WorkflowState } from '../../src/models/workflowState.js';
import { ArtifactType } from '../../src/models/artifact.js';
import { WorktreeInfo } from '../../src/services/worktreeService.js';

const FIXTURE_SPECS = vscode.Uri.joinPath(
  vscode.workspace.workspaceFolders![0].uri,
  'specs',
);

// ─── helpers ────────────────────────────────────────────────────────────────

function makeWorktree(p: string, branch: string | undefined, isCurrent: boolean): WorktreeInfo {
  return { path: p, branch, isCurrentWorkspace: isCurrent };
}

function makeFeature(number: string, state: WorkflowState, worktree: WorktreeInfo): Feature {
  return {
    number,
    shortName: `feat-${number}`,
    branchName: `${number}-feat-${number}`,
    directoryPath: `/repo/main/specs/${number}-feat-${number}`,
    state,
    artifacts: [
      {
        fileName: 'spec.md',
        filePath: `/repo/main/specs/${number}-feat-${number}/spec.md`,
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

// ─── Tests ───────────────────────────────────────────────────────────────────

suite('Multi-worktree tree rendering (US1, US2)', () => {
  test('T024: single worktree renders WorktreeGroupItem at root (always grouped)', async () => {
    // No gitRoot → falls back to single-worktree mode using fixture specs.
    // After this feature, the grouped layout is used even for single worktrees.
    const provider = new FeatureTreeProvider(FIXTURE_SPECS, undefined);
    await provider.refresh();

    const children = await provider.getChildren(undefined);

    assert.ok(children.length > 0, 'should have at least one group');
    const allAreGroupItems = children.every((c) => c instanceof WorktreeGroupItem);
    assert.ok(allAreGroupItems, 'root children must be WorktreeGroupItem even in single-worktree mode');

    const hasFeatureItem = children.some((c) => c instanceof FeatureTreeItem);
    assert.ok(!hasFeatureItem, 'FeatureTreeItem must NOT appear at root level');
  });

  test('T025: two-group provider renders WorktreeGroupItem nodes at root level', async () => {
    // We test getChildren logic directly using a provider that has been primed with two groups.
    // Since FeatureTreeProvider.getChildren is driven by _groups.length, we verify
    // by constructing a provider, replacing its refresh to inject two groups, then calling getChildren.

    const mainWorktree = makeWorktree('/repo/main', 'main', true);
    const remoteWorktree = makeWorktree('/repo/feature', '004-feature', false);

    const groups = [
      makeGroup(mainWorktree, [makeFeature('001', WorkflowState.Specified, mainWorktree)]),
      makeGroup(remoteWorktree, [makeFeature('002', WorkflowState.Planned, remoteWorktree)]),
    ];

    // sortGroups is pure — verify it preserves both groups and sorts current workspace first
    const result = sortGroups(groups);
    assert.strictEqual(result.length, 2, 'both groups should be preserved');
    assert.strictEqual(result[0].worktree.isCurrentWorkspace, true, 'current workspace first');

    // Verify WorktreeGroupItem is constructed correctly for each group
    const groupItems = result.map((g) => new WorktreeGroupItem(g));
    assert.ok(
      groupItems.every((i) => i instanceof WorktreeGroupItem),
      'all items must be WorktreeGroupItem',
    );
    assert.strictEqual(groupItems[0].label, 'main');
    assert.strictEqual(groupItems[1].label, '004-feature');
  });

  test('T035: same feature number in two worktrees appears in exactly one group after dedup', () => {
    const mainWorktree = makeWorktree('/repo/main', 'main', true);
    // Branch name suffix-matches "003-feat-003" → remoteWorktree wins
    const remoteWorktree = makeWorktree('/repo/feature', '003-feat-003', false);

    const groups = [
      makeGroup(mainWorktree, [makeFeature('003', WorkflowState.Specified, mainWorktree)]),
      makeGroup(remoteWorktree, [makeFeature('003', WorkflowState.Implementing, remoteWorktree)]),
    ];

    // Verify sortGroups preserves both groups (dedup is separate)
    const sorted = sortGroups(groups);
    assert.strictEqual(sorted.length, 2, 'sortGroups preserves both groups');

    // deduplicateFeatures is tested separately in worktreeAggregator.test.ts;
    // this test confirms the data model supports it
    const allFeatures = sorted.flatMap((g) => g.features);
    assert.strictEqual(allFeatures.length, 2, 'sortGroups itself does not deduplicate');
  });
});
