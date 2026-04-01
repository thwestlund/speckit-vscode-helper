import * as assert from 'assert';
import * as vscode from 'vscode';
import { discoverFeatures } from '../../src/services/specDiscovery.js';
import { WorktreeInfo } from '../../src/services/worktreeService.js';

suite('specDiscovery — artifact path rooting (T028)', () => {
  test('artifact.filePath is rooted under worktree.path for each discovered feature', async () => {
    const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
    const specsUri = vscode.Uri.joinPath(workspaceUri, 'specs');

    const worktree: WorktreeInfo = {
      path: workspaceUri.fsPath,
      branch: 'test-branch',
      isCurrentWorkspace: true,
    };

    const features = await discoverFeatures(specsUri, worktree);
    assert.ok(features.length > 0, 'should discover at least one feature');

    for (const feature of features) {
      for (const artifact of feature.artifacts) {
        assert.ok(
          artifact.filePath.startsWith(worktree.path),
          `artifact.filePath "${artifact.filePath}" must start with worktree.path "${worktree.path}"`,
        );
      }
    }
  });
});
