import * as assert from 'assert';
import * as vscode from 'vscode';
import { FeatureTreeProvider } from '../../src/providers/featureTreeProvider.js';
import { FeatureTreeItem } from '../../src/providers/featureTreeItem.js';

suite('FeatureTreeProvider sort order (US2)', () => {
  let specsUri: vscode.Uri;

  suiteSetup(() => {
    const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
    specsUri = vscode.Uri.joinPath(workspaceUri, 'specs');
  });

  test('getChildren returns needsAction features before non-needsAction features', async () => {
    const provider = new FeatureTreeProvider(specsUri);
    await provider.refresh();

    const children = (await provider.getChildren()) as FeatureTreeItem[];
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

    const children = (await provider.getChildren()) as FeatureTreeItem[];

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
