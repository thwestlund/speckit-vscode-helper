import * as assert from 'assert';
import * as vscode from 'vscode';
import { FeatureTreeProvider } from '../../src/providers/featureTreeProvider.js';
import { FeatureTreeItem } from '../../src/providers/featureTreeItem.js';

suite('FileWatcher Indicator (FR-003)', () => {
  let specsUri: vscode.Uri;
  const createdFiles: vscode.Uri[] = [];

  suiteSetup(() => {
    const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
    specsUri = vscode.Uri.joinPath(workspaceUri, 'specs');
  });

  suiteTeardown(async () => {
    // Clean up any files created during tests
    for (const uri of createdFiles) {
      try {
        await vscode.workspace.fs.delete(uri);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('adding plan.md to a Specified feature changes pendingActionLabel to "Generate tasks"', async () => {
    const provider = new FeatureTreeProvider(specsUri);
    await provider.refresh();

    // Verify initial state: 004-specified is Specified with "Create a plan" label
    let children = (await provider.getChildren()) as FeatureTreeItem[];
    let item004 = children.find((c) => c.feature.branchName === '004-specified');
    assert.ok(item004, '004-specified must be in the tree');
    assert.strictEqual(item004.feature.actionState.needsAction, true);
    assert.ok(
      item004.feature.actionState.pendingActionLabel?.includes('plan'),
      `Initial label should reference "plan", got: ${item004.feature.actionState.pendingActionLabel}`,
    );

    // Create plan.md to advance feature to Planned state
    const planUri = vscode.Uri.joinPath(specsUri, '004-specified', 'plan.md');
    createdFiles.push(planUri);
    await vscode.workspace.fs.writeFile(planUri, Buffer.from('# Plan\n'));

    // Refresh the provider (simulating what FileWatcher does on file change)
    await provider.refresh();

    children = (await provider.getChildren()) as FeatureTreeItem[];
    item004 = children.find((c) => c.feature.branchName === '004-specified');
    assert.ok(item004, '004-specified must still be in the tree after plan.md added');

    // Feature should still need action (Planned state still needs action)
    assert.strictEqual(
      item004.feature.actionState.needsAction,
      true,
      'Feature should still need action after advancing to Planned',
    );
    assert.ok(
      item004.feature.actionState.pendingActionLabel
        ?.toLowerCase()
        .includes('task') ||
        item004.feature.actionState.pendingActionLabel
          ?.toLowerCase()
          .includes('tasks'),
      `Label should reference tasks after advancing to Planned, got: ${item004.feature.actionState.pendingActionLabel}`,
    );

    // Warning icon should still be present
    assert.ok(item004.iconPath instanceof vscode.ThemeIcon);
    assert.strictEqual((item004.iconPath as vscode.ThemeIcon).id, 'warning');

    provider.dispose();
  });
});
