import * as assert from 'assert';
import * as vscode from 'vscode';
import { FeatureTreeProvider } from '../../src/providers/featureTreeProvider.js';
import { FeatureTreeItem } from '../../src/providers/featureTreeItem.js';
import { WorktreeGroupItem } from '../../src/providers/worktreeGroupItem.js';

// Helper: navigate through the new grouped tree structure.
// getChildren(undefined) → WorktreeGroupItem[]; getChildren(group) → FeatureTreeItem[]
async function getFlatFeatureItems(provider: FeatureTreeProvider): Promise<FeatureTreeItem[]> {
  const groups = (await provider.getChildren()) as WorktreeGroupItem[];
  const nested = await Promise.all(
    groups.map((g) => provider.getChildren(g) as Promise<FeatureTreeItem[]>),
  );
  return nested.flat();
}

suite('FeatureTreeProvider — grouped structure (US1, T015)', () => {
  let specsUri: vscode.Uri;

  suiteSetup(() => {
    const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
    specsUri = vscode.Uri.joinPath(workspaceUri, 'specs');
  });

  test('getChildren(undefined) always returns WorktreeGroupItem[] even for single worktree', async () => {
    const provider = new FeatureTreeProvider(specsUri);
    await provider.refresh();

    const topLevel = await provider.getChildren();
    assert.ok(topLevel.length > 0, 'must have at least one group');
    for (const item of topLevel) {
      assert.ok(
        item instanceof WorktreeGroupItem,
        `Expected WorktreeGroupItem, got ${item.constructor.name}`,
      );
    }
    provider.dispose();
  });

  test('single-worktree group label is the current branch name or a fallback', async () => {
    const provider = new FeatureTreeProvider(specsUri);
    await provider.refresh();

    const topLevel = (await provider.getChildren()) as WorktreeGroupItem[];
    // There must be exactly one group in the single-worktree test workspace
    assert.strictEqual(topLevel.length, 1, 'single-worktree setup produces one group');

    const group = topLevel[0];
    assert.ok(
      typeof group.label === 'string' && group.label.length > 0,
      'group label must be a non-empty string',
    );
    provider.dispose();
  });

  test('features are children of their WorktreeGroupItem, not top-level', async () => {
    const provider = new FeatureTreeProvider(specsUri);
    await provider.refresh();

    const topLevel = await provider.getChildren();
    // No top-level item should be a FeatureTreeItem
    for (const item of topLevel) {
      assert.ok(
        !(item instanceof FeatureTreeItem),
        'FeatureTreeItem must not appear at the top level',
      );
    }

    // Features must be accessible via the group children
    const features = await getFlatFeatureItems(provider);
    assert.ok(features.length > 0, 'must have features nested under group items');

    provider.dispose();
  });

  test('each feature branchName appears in at most one group (T006, T012)', async () => {
    const provider = new FeatureTreeProvider(specsUri);
    await provider.refresh();

    const groups = (await provider.getChildren()) as WorktreeGroupItem[];
    const allBranchNames: string[] = [];
    for (const g of groups) {
      const children = (await provider.getChildren(g)) as FeatureTreeItem[];
      for (const c of children) {
        if (c instanceof FeatureTreeItem) {
          allBranchNames.push(c.feature.branchName);
        }
      }
    }
    const unique = new Set(allBranchNames);
    assert.strictEqual(
      allBranchNames.length,
      unique.size,
      `Duplicate branchNames found: ${allBranchNames.join(', ')}`,
    );

    provider.dispose();
  });
});

suite('FeatureTreeProvider sort order (US2)', () => {
  let specsUri: vscode.Uri;

  suiteSetup(() => {
    const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
    specsUri = vscode.Uri.joinPath(workspaceUri, 'specs');
  });

  test('getChildren returns needsAction features before non-needsAction features', async () => {
    const provider = new FeatureTreeProvider(specsUri);
    await provider.refresh();

    const children = await getFlatFeatureItems(provider);
    assert.ok(children.length > 0, 'Tree must contain features');

    // Split into two groups
    const needsActionItems = children.filter((c) => c.feature.actionState.needsAction);
    const noActionItems = children.filter((c) => !c.feature.actionState.needsAction);

    assert.ok(needsActionItems.length > 0, 'There must be features that need action');
    assert.ok(noActionItems.length > 0, 'There must be features that do not need action');

    // All needsAction items must appear before any noAction items
    const firstNoActionIndex = children.findIndex((c) => !c.feature.actionState.needsAction);
    const lastNeedsActionIndex = children.reduceRight(
      (acc, c, i) => (c.feature.actionState.needsAction && acc === -1 ? i : acc),
      -1,
    );

    if (firstNoActionIndex !== -1 && lastNeedsActionIndex !== -1) {
      assert.ok(
        lastNeedsActionIndex < firstNoActionIndex,
        `All needsAction features must appear before noAction features. ` +
          `Last needsAction index: ${lastNeedsActionIndex}, first noAction index: ${firstNoActionIndex}. ` +
          `Order: ${children.map((c) => `${c.feature.branchName}(${c.feature.actionState.needsAction})`).join(', ')}`,
      );
    }

    provider.dispose();
  });

  test('features within same needsAction group are sorted by feature number (ascending)', async () => {
    const provider = new FeatureTreeProvider(specsUri);
    await provider.refresh();

    const children = await getFlatFeatureItems(provider);

    // Check ordering within the needsAction group
    const needsActionItems = children.filter((c) => c.feature.actionState.needsAction);
    for (let i = 1; i < needsActionItems.length; i++) {
      const prev = needsActionItems[i - 1];
      const curr = needsActionItems[i];
      assert.ok(
        prev.feature.branchName.localeCompare(curr.feature.branchName, undefined, {
          numeric: true,
        }) <= 0,
        `needsAction features must be in ascending order: ${prev.feature.branchName} should come before ${curr.feature.branchName}`,
      );
    }

    // Check ordering within the noAction group
    const noActionItems = children.filter((c) => !c.feature.actionState.needsAction);
    for (let i = 1; i < noActionItems.length; i++) {
      const prev = noActionItems[i - 1];
      const curr = noActionItems[i];
      assert.ok(
        prev.feature.branchName.localeCompare(curr.feature.branchName, undefined, {
          numeric: true,
        }) <= 0,
        `noAction features must be in ascending order: ${prev.feature.branchName} should come before ${curr.feature.branchName}`,
      );
    }

    provider.dispose();
  });
});
