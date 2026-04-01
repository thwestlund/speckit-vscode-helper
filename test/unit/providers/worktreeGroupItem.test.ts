import * as assert from 'assert';
import * as vscode from 'vscode';
import { WorktreeGroupItem } from '../../../src/providers/worktreeGroupItem.js';
import { WorktreeInfo } from '../../../src/services/worktreeService.js';

function makeGroup(worktree: WorktreeInfo) {
  return { worktree, features: [] };
}

suite('WorktreeGroupItem (US2)', () => {
  test('uses branch name as label when branch is defined', () => {
    const item = new WorktreeGroupItem(
      makeGroup({ path: '/repo/feature', branch: '004-my-feature', isCurrentWorkspace: false }),
    );
    assert.strictEqual(item.label, '004-my-feature');
  });

  test('uses basename + "(detached)" for detached HEAD worktree', () => {
    const item = new WorktreeGroupItem(
      makeGroup({ path: '/repo/some-feature', branch: undefined, isCurrentWorkspace: false }),
    );
    assert.strictEqual(item.label, 'some-feature (detached)');
  });

  test('description is "(current)" for current workspace', () => {
    const item = new WorktreeGroupItem(
      makeGroup({ path: '/repo/main', branch: 'main', isCurrentWorkspace: true }),
    );
    assert.strictEqual(item.description, '(current)');
  });

  test('description is undefined for remote worktree', () => {
    const item = new WorktreeGroupItem(
      makeGroup({ path: '/repo/feature', branch: '004-feature', isCurrentWorkspace: false }),
    );
    assert.strictEqual(item.description, undefined);
  });

  test('icon is "home" for current workspace', () => {
    const item = new WorktreeGroupItem(
      makeGroup({ path: '/repo/main', branch: 'main', isCurrentWorkspace: true }),
    );
    assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'home');
  });

  test('icon is "source-control" for remote worktree', () => {
    const item = new WorktreeGroupItem(
      makeGroup({ path: '/repo/feature', branch: '004-feature', isCurrentWorkspace: false }),
    );
    assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'source-control');
  });

  test('contextValue is "worktreeGroup"', () => {
    const item = new WorktreeGroupItem(
      makeGroup({ path: '/repo/main', branch: 'main', isCurrentWorkspace: true }),
    );
    assert.strictEqual(item.contextValue, 'worktreeGroup');
  });
});
