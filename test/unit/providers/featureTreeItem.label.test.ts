import * as assert from 'assert';
import * as vscode from 'vscode';
import { FeatureTreeItem } from '../../../src/providers/featureTreeItem.js';
import { Feature } from '../../../src/models/feature.js';
import { WorkflowState } from '../../../src/models/workflowState.js';
import { deriveActionState } from '../../../src/models/actionState.js';

const CURRENT_WORKTREE = { path: '/repo/main', branch: 'main', isCurrentWorkspace: true };

function makeFeature(dirName: string): Feature {
  const match = /^(\d+(?:-\d+)?)-(.+)$/.exec(dirName);
  const number = match ? match[1] : dirName;
  const shortName = match ? match[2] : dirName;
  return {
    number,
    shortName,
    branchName: dirName,
    directoryPath: `/fixture/${dirName}`,
    state: WorkflowState.Specified,
    artifacts: [],
    actionState: deriveActionState(WorkflowState.Specified),
    worktreeSource: CURRENT_WORKTREE,
  };
}

suite('FeatureTreeItem label (US1)', () => {
  test('standard dir "002-in-progress" produces label "002 in-progress"', () => {
    const item = new FeatureTreeItem(makeFeature('002-in-progress'));
    assert.strictEqual(item.label, '002 in-progress');
  });

  test('standard dir "001-complete-feature" produces label "001 complete-feature"', () => {
    const item = new FeatureTreeItem(makeFeature('001-complete-feature'));
    assert.strictEqual(item.label, '001 complete-feature');
  });

  test('non-standard dir where number === shortName falls back to shortName alone', () => {
    const item = new FeatureTreeItem(makeFeature('unknown-dir'));
    assert.strictEqual(item.label, 'unknown-dir');
  });

  test('description still shows the state label unchanged', () => {
    const item = new FeatureTreeItem(makeFeature('003-planned'));
    assert.ok(
      typeof item.description === 'string' && item.description.length > 0,
      'description must still be set',
    );
  });
});
